import os
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.app.schemas.predict import PredictRequest, PredictionResponse
from backend.app.services.predictor import predictor_service

app = FastAPI(title="F1 Pit Stop Predictor API")

# Configure CORS origins from environment variable or default to localhost
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load circuits data once on startup
BASE_DIR = Path(__file__).resolve().parent
CIRCUITS_FILE = BASE_DIR / "data" / "circuits.json"

with open(CIRCUITS_FILE, "r") as f:
    circuits_data = json.load(f)
circuits = circuits_data.get("circuits", {})

@app.get("/api/circuits")
def get_circuits():
    # Return the dictionary of verified circuit presets
    return circuits

@app.get("/api/model-info")
def get_model_info():
    # Return model metadata to keep the threshold configuration centralized
    return {
        "threshold": predictor_service.threshold,
        "features": predictor_service.features
    }

@app.post("/api/predict", response_model=PredictionResponse)
def predict_lap(payload: PredictRequest):
    # Retrieve static circuit details using the circuit_key
    circuit_key = payload.circuit_key.upper()
    if circuit_key not in circuits:
        raise HTTPException(status_code=404, detail=f"Circuit key '{circuit_key}' not found.")

    circuit_data = circuits[circuit_key]

    # Convert incoming Pydantic payload to dictionary and remove circuit_key
    input_features = payload.model_dump()
    input_features.pop("circuit_key")

    # Merge dynamic input values with static circuit presets
    input_features.update({
        "track_length_km": circuit_data["track_length_km"],
        "num_corners": circuit_data["num_corners"],
        "race_laps": circuit_data["race_laps"],
        "race_distance_km": circuit_data["race_distance_km"],
        "pit_lane_speed_limit_kmh": circuit_data["pit_lane_speed_limit_kmh"],
        "pit_loss_delta_s": circuit_data["pit_loss_delta_s"],
        "elevation_change_m": circuit_data["elevation_change_m"],
        "circuit_type_enc": circuit_data["circuit_type_enc"],
        "overtaking_difficulty_enc": circuit_data["overtaking_difficulty_enc"],
        "tyre_stress_enc": circuit_data["tyre_stress_enc"],
        "clockwise": circuit_data["clockwise"]
    })

    try:
        # Run prediction via the predictor service
        prediction = predictor_service.predict(input_features)
        return prediction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
