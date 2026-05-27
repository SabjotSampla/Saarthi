import os
import cv2
import numpy as np
import base64
import pickle
from deepface import DeepFace

# Load calibrator model globally
model_path = os.path.join(os.path.dirname(__file__), 'confidence_calibrator.pkl')
calibrator_model = None

if os.path.exists(model_path):
    try:
        with open(model_path, 'rb') as f:
            calibrator_model = pickle.load(f)
        print(f"Confidence calibrator model loaded successfully from {model_path}")
    except Exception as e:
        print(f"Error loading calibrator model: {repr(e)}")
else:
    print("Warning: confidence_calibrator.pkl not found. Falling back to heuristic.")

def base64_to_cv2(base64_string: str):
    """Convers a base64 encoded image to a cv2 image."""
    encoded_data = base64_string.split(',')[1] if ',' in base64_string else base64_string
    nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def get_face_embeddings(image_path_or_cv2, enforce_detection=True):
    """
    Extracts face embeddings using Facenet512 via DeepFace with MTCNN.
    Returns a list of dictionaries with embedding and facial area.
    """
    try:
        # returns [{'embedding': [...], 'facial_area': {...}, ...}]
        faces = DeepFace.represent(
            img_path=image_path_or_cv2, 
            model_name="Facenet512", # Using 512 for higher dimensionality
            detector_backend='mtcnn', # Much more accurate than opencv
            enforce_detection=enforce_detection,
            align=True
        )
        return faces
    except Exception as e:
        print(f"DeepFace processing error: {e}")
        return []

def calculate_similarity(embedding1, embedding2):
    """
    Calculates cosine distance between two embeddings.
    """
    e1 = np.array(embedding1)
    e2 = np.array(embedding2)
    
    # Standard Cosine Distance: 1 - Cosine Similarity
    dot = np.dot(e1, e2)
    norm_a = np.linalg.norm(e1)
    norm_b = np.linalg.norm(e2)
    similarity = dot / (norm_a * norm_b)
    distance = 1 - similarity
    return distance

def get_match_confidence(distance: float) -> float:
    """
    Mapping Facenet512 cosine distance to standardized confidence bands.
    Using Facenet512, distances are usually 0.5 to 1.0.
    """
    # High Confidence Band: > 80% (Distance <= 0.55)
    # Medium Confidence Band: 60 - 80% (Distance 0.55 to 0.85)
    # Low Confidence Band: < 60% (Distance > 0.85)
    
    if distance > 0.85:
        # Noise or different person (Map: >0.85 -> 0-60%)
        # Just give a low flat rate scaling
        confidence = max(0.0, 60.0 - ((distance - 0.85) * 100))
    elif distance > 0.55:
        # Medium match (Map: 0.55-0.85 -> 80-60%)
        # Interpolate: distance=0.85 -> 60%, distance=0.55 -> 80%
        ratio = (0.85 - distance) / 0.30
        confidence = 60.0 + (ratio * 20.0)
    else:
        # High match (Map: 0.0-0.55 -> 100-80%)
        # Interpolate: distance=0.55 -> 80%, distance=0.2 -> 95%, distance=0.0 -> 100%
        ratio = min(1.0, (0.55 - distance) / 0.35)
        confidence = 80.0 + (ratio * 20.0)
        
    print(f"CALC: Distance {distance:.4f} -> Confidence {confidence:.2f}%")
    return round(min(100.0, max(0.0, confidence)), 2)
