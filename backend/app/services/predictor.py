import os
import joblib
import pandas as pd
from pathlib import Path
from typing import Dict, Any

# Resolve model path dynamically
# predictor.py is located at backend/app/services/predictor.py
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent.parent
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models" / "best_model.pkl"

class PredictorService:
    def __init__(self, model_path: Path = DEFAULT_MODEL_PATH):
        # Fallbacks for finding model file in different running contexts
        if not model_path.exists():
            alternative_path = Path("models/best_model.pkl")
            if alternative_path.exists():
                self.model_path = alternative_path
            else:
                # Try finding from the current working directory as absolute fallback
                self.model_path = Path(os.getcwd()) / "models" / "best_model.pkl"
                if not self.model_path.exists():
                    raise FileNotFoundError(
                        f"Model file best_model.pkl not found. Tried paths:\n"
                        f" - {model_path}\n"
                        f" - {alternative_path}\n"
                        f" - {self.model_path}"
                    )
        else:
            self.model_path = model_path

        # Load the model dict (trained with dict keys: ['model_name', 'model', 'threshold', 'features'])
        model_dict = joblib.load(self.model_path)
        
        self.model = model_dict["model"]
        self.feature_names = model_dict["features"]
        self.threshold = model_dict["threshold"]
        self.model_name = model_dict.get("model_name", "XGBoost")

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates feature alignment and predicts the probability of a pit stop.
        """
        # Validate that all required features are present
        missing_features = [f for f in self.feature_names if f not in input_data]
        if missing_features:
            raise ValueError(f"Feature alignment validation failed. Missing features: {missing_features}")

        # Construct single-row DataFrame ordered exactly like the training feature set
        # This aligns the features for the model's prediction step
        df = pd.DataFrame([input_data])
        df = df[self.feature_names]

        # Get probabilities [prob_class_0, prob_class_1]
        probabilities = self.model.predict_proba(df)
        pit_probability = float(probabilities[0][1])

        # Decide whether to pit based on the loaded threshold (single source of truth)
        should_pit = pit_probability >= self.threshold

        return {
            "probability": pit_probability,
            "should_pit": should_pit,
            "threshold": self.threshold
        }

# Singleton instance initialized once on startup/import
predictor_service = PredictorService()
