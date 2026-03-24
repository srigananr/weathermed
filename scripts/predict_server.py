"""FastAPI server that serves XGBoost disease predictions.

Usage:
  pip install fastapi uvicorn joblib xgboost scikit-learn pandas
  python scripts/predict_server.py

The server listens on http://0.0.0.0:8000
Endpoint: POST /predict
"""

import os
from typing import Optional

import joblib
import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_PATH = os.path.join(ROOT, "model", "xgb_model.pkl")
ENCODER_PATH = os.path.join(ROOT, "model", "label_encoder.pkl")
FEATURES_PATH = os.path.join(ROOT, "model", "feature_list.pkl")

app = FastAPI(title="WeatherMed Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model artefacts once at startup
try:
    model = joblib.load(MODEL_PATH)
    label_encoder = joblib.load(ENCODER_PATH)
    feature_list = joblib.load(FEATURES_PATH)
    print("Model loaded successfully.")
except FileNotFoundError:
    raise RuntimeError(
        "Model files not found. Run scripts/train_model.py first."
    )


class PredictRequest(BaseModel):
    # Weather + demographic features
    age: Optional[float] = 0
    gender: Optional[float] = 0
    temperature_c: Optional[float] = 25
    humidity: Optional[float] = 0
    wind_speed_km_h: Optional[float] = 0
    # All symptom and comorbidity fields are accepted as extra fields
    model_config = {"extra": "allow"}


@app.post("/predict")
def predict(request: PredictRequest):
    data = request.model_dump()

    # Build feature vector in the exact order the model was trained on
    row = []
    for feat in feature_list:
        row.append(float(data.get(feat, 0) or 0))

    X = np.array([row])

    # Get probability scores for all classes
    try:
        proba = model.predict_proba(X)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    # Return top-3 diseases sorted by probability descending
    top_indices = proba.argsort()[::-1][:3]
    predictions = [
        {
            "disease": label_encoder.classes_[i],
            "probability": round(float(proba[i]), 4),
        }
        for i in top_indices
        if proba[i] > 0
    ]

    return {"predictions": predictions}


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
