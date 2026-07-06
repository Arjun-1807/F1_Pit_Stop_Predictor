import joblib
import pandas as pd
from pathlib import Path

# Find the model file path relative to this script
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
MODEL_PATH = BASE_DIR / "models" / "best_model.pkl"

class PredictorService:
    def __init__(self, model_path=MODEL_PATH):
        # Load the trained model dictionary
        model_dict = joblib.load(model_path)
        self.model = model_dict["model"]
        self.features = model_dict["features"]
        self.threshold = model_dict["threshold"]

    def predict(self, data: dict) -> dict:
        # Create a DataFrame and align column order with model features
        df = pd.DataFrame([data])[self.features]
        
        # Predict the probability of a pit stop (index 1 is the positive class)
        prob = float(self.model.predict_proba(df)[0][1])
        
        # Determine the action based on the optimal threshold
        should_pit = prob >= self.threshold
        
        return {
            "probability": prob,
            "should_pit": should_pit,
            "threshold": self.threshold
        }

# Shared instance to prevent reloading the model on every request
predictor_service = PredictorService()
