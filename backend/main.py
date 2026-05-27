import sys

# Configure stdout and stderr to handle utf-8 safely, especially for paths with non-ASCII characters
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json
import uuid
import numpy as np
from datetime import timedelta
import face_utils
from jose import JWTError, jwt
import requests

import models, schemas, auth
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Saarthi AI API")

last_sms_sent = {} # Global dict to track throttling: {person_id: float_timestamp}
temporal_tracker = {} # Global dict to track consecutive hits: {person_id: int_hits}

@app.on_event("startup")
async def startup_event():
    print("Warming up AI models...")
    try:
        face_utils.get_face_embeddings(np.zeros((100, 100, 3), dtype=np.uint8), enforce_detection=False)
        print("AI model warm-up complete.")
    except Exception as e:
        print(f"Model warm-up failed: {e}")
        
    # Setup Default Admin and User
    db = next(get_db())
    admin_exists = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin_exists:
        try:
            admin_user = models.User(username="admin", hashed_password=auth.get_password_hash("admin123"), role="Admin")
            db.add(admin_user)
            db.commit()
            print("Default admin created.")
        except Exception:
            pass


# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def get_current_user(token: str = Depends(auth.oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user

@app.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@app.get("/users/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

def process_embedding_bg(person_id: int, file_path: str):
    from database import SessionLocal
    db = SessionLocal()
    try:
        person = db.query(models.Person).filter(models.Person.id == person_id).first()
        if not person: return
        try:
            faces = face_utils.get_face_embeddings(file_path)
            if faces:
                person.face_embeddings = json.dumps(faces[0]['embedding'])
                person.status = "Searching"
            else:
                person.status = "Error: No face detected"
        except Exception as e:
            person.status = f"Error: {str(e)}"
        db.commit()
    finally:
        if os.path.exists(file_path) and person and "Error" in person.status:
             os.remove(file_path)
        db.close()

@app.post("/add-person", response_model=schemas.PersonResponse)
async def add_person(
    name: str = Form(...),
    age: str = Form("0"),
    gender: str = Form("Unknown"),
    last_seen_location: str = Form(""),
    date_missing: str = Form(""),
    description: str = Form(""),
    contact_phone: str = Form(""),
    justification: str = Form(""),
    uid: str = Form(""),
    image: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Try converting age, default to 0 if invalid
    try:
        parsed_age = int(age) if age.strip() else 0
    except ValueError:
        parsed_age = 0

    # Save the uploaded image
    file_ext = os.path.splitext(image.filename)[1]
    file_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join("uploads", file_name)
    
    with open(file_path, "wb") as buffer:
        buffer.write(await image.read())

    # We no longer run embedding here! We move it to background.
    embedding_json = ""

    # Parse date missing robustly
    from datetime import datetime
    import random
    parsed_date = datetime.utcnow()
    if date_missing.strip():
        try:
            # Try to handle formats like "2026-04-19" or ISO format
            clean_date = date_missing.replace('Z', '').split('T')[0] 
            parsed_date = datetime.fromisoformat(clean_date)
        except Exception:
            pass

    db_person = models.Person(
        name=name,
        age=parsed_age,
        gender=gender,
        last_seen_location=last_seen_location,
        date_missing=parsed_date,
        description=description,
        contact_phone=contact_phone,
        uid=uid,
        image_paths=file_path,
        face_embeddings=embedding_json,
        status="Indexing...",
        last_lat=None,
        last_lng=None
    )

    db.add(db_person)
    
    if justification.strip():
        audit_log = models.AuditLog(
            user_id=current_user.id,
            action="SEARCH_JUSTIFICATION",
            details=f"Added person '{name}' with justification: {justification}"
        )
        db.add(audit_log)
        
    db.commit()
    db.refresh(db_person)
    
    background_tasks.add_task(process_embedding_bg, db_person.id, file_path)
    
    return db_person

@app.get("/persons", response_model=List[schemas.PersonResponse])
def get_persons(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    persons = db.query(models.Person).offset(skip).limit(limit).all()
    return persons

@app.post("/reprocess-all")
async def reprocess_all(db: Session = Depends(get_db)):
    """
    Upgrades all registered person embeddings to the current model (Facenet512).
    Use this after changing the AI model in face_utils.
    """
    persons = db.query(models.Person).all()
    count = 0
    for person in persons:
        if os.path.exists(person.image_paths):
            try:
                faces = face_utils.get_face_embeddings(person.image_paths)
                if faces:
                    person.face_embeddings = json.dumps(faces[0]['embedding'])
                    count += 1
            except Exception as e:
                print(f"Failed to reprocess {person.name}: {e}")
    db.commit()
    return {"detail": f"Successfully upgraded {count} identities to the new model."}

@app.get("/alerts", response_model=List[schemas.AlertResponse])
def get_alerts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).order_by(models.Alert.timestamp.desc()).offset(skip).limit(limit).all()
    return alerts

@app.put("/alerts/{alert_id}/verify")
def verify_alert_manual(alert_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_confirmed = True
    
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="MANUAL_VERIFICATION",
        details=f"Alert {alert_id} verified manually."
    )
    db.add(audit_log)
    db.commit()
    db.refresh(alert)
    return alert

@app.delete("/persons/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    db_person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not db_person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Cleanup files
    if db_person.image_paths:
        for path in db_person.image_paths.split(','):
            if os.path.exists(path):
                os.remove(path)
                
    # Cleanup alert frames and delete from DB
    alerts = db.query(models.Alert).filter(models.Alert.person_id == person_id).all()
    for alert in alerts:
        if alert.image_frame and os.path.exists(alert.image_frame):
            os.remove(alert.image_frame)
        db.delete(alert)

    db.delete(db_person)
    
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="DELETED_PERSON",
        details=f"Purged identity '{db_person.name}'"
    )
    db.add(audit_log)
    
    db.commit()
    return {"detail": "Person and associated data deleted"}

@app.put("/alerts/{alert_id}/verify")
def verify_alert(alert_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.is_confirmed = True
    db.commit()
    
    # SMS API integration for manual verification
    best_match = alert.person
    if best_match and best_match.contact_phone:
        try:
            import requests
            import re
            
            clean_phone = re.sub(r'\D', '', best_match.contact_phone)
            if clean_phone.startswith('91') and len(clean_phone) > 10:
                clean_phone = clean_phone[2:]
                
            url = "https://api.msg91.com/api/v2/sendsms"
            payload = {
                "sender": "SAARTH",
                "route": "4",
                "country": "91",
                "sms": [
                    {
                        "message": f"SAARTHI AI VERIFIED: Target '{best_match.name}' found at {alert.location}.",
                        "to": [clean_phone]
                    }
                ]
            }
            headers = {
                "authkey": "510567AzNxaVFo8Dl69e75436P1", 
                "content-type": "application/json"
            }
            res = requests.post(url, json=payload, headers=headers, timeout=5)
            print(f"Manual verify MSG91 SMS SENT STATUS: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"Manual verify SMS failed: {e}")
            
    return {"detail": "Verified and MSG91 SMS dispatched"}

@app.get("/cameras", response_model=List[schemas.CameraResponse])
def get_cameras(db: Session = Depends(get_db)):
    return db.query(models.Camera).all()

@app.post("/cameras", response_model=schemas.CameraResponse)
def add_camera(camera: schemas.CameraCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    db_camera = models.Camera(**camera.dict())
    db.add(db_camera)
    
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="ADDED_CAMERA",
        details=f"Integrated sensor vector '{camera.name}'"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(db_camera)
    return db_camera

@app.delete("/cameras/{camera_id}")
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    db_camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    db.delete(db_camera)
    db.commit()
    return {"detail": "Camera deleted"}

@app.post("/detect", response_model=schemas.BatchDetectionResult)
async def detect_face(
    image: UploadFile = File(...),
    location: str = Form("CCTV Camera 01"),
    privacy_mode: str = Form("false"),
    lat: float = Form(None),
    lng: float = Form(None),
    db: Session = Depends(get_db)
):
    # Save the frame temporarily
    temp_file = f"temp_detect_{uuid.uuid4()}.jpg"
    temp_path = os.path.join("uploads", temp_file)
    
    with open(temp_path, "wb") as buffer:
        buffer.write(await image.read())

    try:
        # Get embeddings from the frame
        faces = face_utils.get_face_embeddings(temp_path)
        if not faces:
            os.remove(temp_path)
            return schemas.BatchDetectionResult(location=location, matches=[], unmatched_faces=[])
        
        print(f"DEBUG: Detection trigger at {location}. {len(faces)} face(s) found.")
        
        # Fetch all registered persons
        all_persons = db.query(models.Person).all()
        
        matches = []
        unmatched_faces = []
        
        # We evaluate EVERY face detected against ALL registered persons, 
        # but keep only the best match per person in this frame.
        person_matches = {}
        unmatched_faces = []
        
        for face in faces:
            detected_embedding = face['embedding']
            facial_area = face['facial_area']
            
            best_match = None
            max_confidence = 0.0
            
            for person in all_persons:
                if not person.face_embeddings:
                    continue
                stored_embedding = json.loads(person.face_embeddings)
                distance = face_utils.calculate_similarity(detected_embedding, stored_embedding)
                confidence = face_utils.get_match_confidence(distance)
                
                if confidence > max_confidence:
                    max_confidence = confidence
                    best_match = person

            if max_confidence >= 50.0 and best_match:
                if best_match.id in person_matches:
                    if max_confidence > person_matches[best_match.id]['confidence']:
                        # The old face becomes unmatched
                        unmatched_faces.append(person_matches[best_match.id]['facial_area'])
                        person_matches[best_match.id] = {
                            'confidence': max_confidence,
                            'facial_area': facial_area,
                            'person': best_match
                        }
                    else:
                        unmatched_faces.append(facial_area)
                else:
                    person_matches[best_match.id] = {
                        'confidence': max_confidence,
                        'facial_area': facial_area,
                        'person': best_match
                    }
            else:
                unmatched_faces.append(facial_area)

        matches = []
        
        for p_id, match_data in person_matches.items():
            best_match = match_data['person']
            max_confidence = match_data['confidence']
            facial_area = match_data['facial_area']

            # Update person's last known location
            if lat is not None and lng is not None:
                best_match.last_lat = float(lat)
                best_match.last_lng = float(lng)
            
            # Temporal Tracking Logic
            if max_confidence >= 60.0:
                temporal_tracker[best_match.id] = temporal_tracker.get(best_match.id, 0) + 1
            else:
                temporal_tracker[best_match.id] = 0 # reset streak if it drops below 60
            
            hits = temporal_tracker.get(best_match.id, 0)
            is_confirmed = (hits >= 2)
            
            new_alert = models.Alert(
                person_id=best_match.id,
                confidence=max_confidence,
                location=location,
                image_frame=temp_path,
                lat=best_match.last_lat,
                lng=best_match.last_lng,
                is_confirmed=is_confirmed
            )
            db.add(new_alert)
            db.commit()
            db.refresh(new_alert)
            
            guardian_notified = False
            # Check for guardian info only if verified
            if is_confirmed:
                import time
                current_time = time.time()
                
                if best_match.contact_phone and len(best_match.contact_phone) > 5:
                    
                    # Throttle SMS to once every 30 seconds (30 seconds) per person
                    last_sent = last_sms_sent.get(best_match.id, 0)
                    if (current_time - last_sent) > 30:
                        guardian_notified = True
                        print(f"** GUARDIAN DISPATCH TRIGGERED ** Sending SMS to {best_match.contact_phone}")
                        last_sms_sent[best_match.id] = current_time
                        
                        try:
                            import re
                            clean_phone = re.sub(r'\D', '', best_match.contact_phone)
                            if clean_phone.startswith('91') and len(clean_phone) > 10:
                                clean_phone = clean_phone[2:]
                                
                            # MSG91 SMS Integration Setup
                            url = "https://api.msg91.com/api/v2/sendsms"
                            payload = {
                                "sender": "SAARTH", # Update if you have an approved DLT Sender ID
                                "route": "4",
                                "country": "91",
                                "sms": [
                                    {
                                        "message": f"SAARTHI AI ALERT: Missing person '{best_match.name}' VERIFIED at {location} with {max_confidence:.1f}% match.",
                                        "to": [clean_phone]
                                    }
                                ]
                            }
                            headers = {
                                "authkey": "510567AzNxaVFo8Dl69e75436P1", # <--- ADD YOUR MSG91 SECRETY KEY HERE
                                "content-type": "application/json"
                            }
                            response = requests.post(url, json=payload, headers=headers, timeout=5)
                            if response.status_code == 200:
                                 print("MSG91 SMS dispatched successfully.")
                            else:
                                 print(f"MSG91 SMS API skipped/failed. Status {response.status_code}. Details: {response.text}")
                        except Exception as ex:
                            print(f"SMS Dispatch Exception: {ex}")
                    else:
                        guardian_notified = True # Still True so UI knows they are actively tracked
                        print(f"SMS throttled for {best_match.name}. Next dispatch allowed in {int(300 - (current_time - last_sent))}s.")
            
            matches.append(schemas.FaceMatch(
                person=best_match,
                confidence=max_confidence,
                facial_area=facial_area,
                guardian_notified=guardian_notified
            ))
                
        # Apply privacy blur if needed
        is_privacy = (privacy_mode.lower() == 'true')
        if is_privacy and unmatched_faces:
            try:
                import cv2
                img = cv2.imread(temp_path)
                if img is not None:
                    for face in unmatched_faces:
                        x = int(max(0, face['x']))
                        y = int(max(0, face['y']))
                        w = int(face['w'])
                        h = int(face['h'])
                        roi = img[y:y+h, x:x+w]
                        if roi.size > 0:
                            img[y:y+h, x:x+w] = cv2.GaussianBlur(roi, (99, 99), 30)
                    cv2.imwrite(temp_path, img)
            except Exception as e:
                print(f"Failed to apply privacy blur: {e}")

        # If no match we can safely remove the image (otherwise we might keep it or clean it up asynchronously)
        if not matches:
             os.remove(temp_path)
             
        return schemas.BatchDetectionResult(
             location=location,
             matches=matches,
             unmatched_faces=unmatched_faces
        )

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
