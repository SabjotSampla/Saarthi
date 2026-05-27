from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="Public") # 'Admin' or 'Public'
    is_active = Column(Boolean, default=True)

class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    last_seen_location = Column(String)
    date_missing = Column(DateTime)
    description = Column(String)
    image_paths = Column(String) # Comma-separated paths
    face_embeddings = Column(String) # JSON string of float array
    contact_phone = Column(String, nullable=True)
    uid = Column(String, nullable=True) # Aadhar ID or similar
    status = Column(String, default="Searching") # 'Searching' or 'Found'
    last_lat = Column(Float, nullable=True)
    last_lng = Column(Float, nullable=True)

    alerts = relationship("Alert", back_populates="person")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id"))
    confidence = Column(Float)
    location = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_confirmed = Column(Boolean, default=False)
    image_frame = Column(String, nullable=True) # Optional path to the frame where match happened
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    person = relationship("Person", back_populates="alerts")

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    url = Column(String) # e.g. http://192.168.1.10:8080/shot.jpg
    type = Column(String, default="IP") # 'Webcam' or 'IP'
    is_active = Column(Boolean, default=True)
    location = Column(String, default="Unknown")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Who did it
    action = Column(String) # e.g., "SEARCH_JUSTIFICATION", "ADDED_CAMERA"
    details = Column(String) # The justification text or other details
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Could add relationship to User later if needed
