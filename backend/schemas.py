from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str
    role: str = "Public"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    action: str
    details: str
    timestamp: datetime
    user_id: Optional[int]

    class Config:
        from_attributes = True

class PersonBase(BaseModel):
    name: str
    age: int
    gender: str
    last_seen_location: str
    date_missing: datetime
    description: str
    last_lat: Optional[float] = None
    last_lng: Optional[float] = None
    contact_phone: Optional[str] = None
    uid: Optional[str] = None

class PersonCreate(PersonBase):
    # Depending on how we upload images (base64 or multipart form), we might not need this here
    pass

class PersonResponse(PersonBase):
    id: int
    image_paths: str
    status: str

    class Config:
        from_attributes = True

class AlertBase(BaseModel):
    person_id: int
    confidence: float
    location: str
    is_confirmed: bool = False
    image_frame: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    timestamp: datetime
    person: PersonResponse

    class Config:
        from_attributes = True

class CameraBase(BaseModel):
    name: str
    url: str
    type: str = "IP"
    is_active: bool = True
    location: str = "Unknown"

class CameraCreate(CameraBase):
    pass

class CameraResponse(CameraBase):
    id: int

    class Config:
        from_attributes = True

class FacialArea(BaseModel):
    x: int
    y: int
    w: int
    h: int

class FaceMatch(BaseModel):
    person: PersonResponse
    confidence: float
    facial_area: FacialArea
    guardian_notified: bool = False

class BatchDetectionResult(BaseModel):
    location: str
    matches: List[FaceMatch] = []
    unmatched_faces: List[FacialArea] = []
