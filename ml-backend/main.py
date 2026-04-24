import os
import pickle
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'model')

try:
    import xgboost
    import sklearn
    import numpy
    print(f"xgboost={xgboost.__version__} sklearn={sklearn.__version__} numpy={numpy.__version__}")
    with open(os.path.join(MODEL_DIR, 'xgb_model.pkl'), 'rb') as f:
        xgb_model = pickle.load(f)
    with open(os.path.join(MODEL_DIR, 'feature_list.pkl'), 'rb') as f:
        FEATURE_LIST = pickle.load(f)
    with open(os.path.join(MODEL_DIR, 'label_encoder.pkl'), 'rb') as f:
        label_encoder = pickle.load(f)
    print(f"Models loaded OK. Features: {len(FEATURE_LIST)}, Classes: {list(label_encoder.classes_)}")
except Exception as e:
    import traceback
    print("STARTUP ERROR:", e)
    traceback.print_exc()
    raise


class PredictRequest(BaseModel):
    age: Optional[float] = 0
    gender: Optional[float] = 0
    temperature_c: Optional[float] = 25
    humidity: Optional[float] = 50
    wind_speed_km_h: Optional[float] = 0
    nausea: Optional[int] = 0
    joint_pain: Optional[int] = 0
    abdominal_pain: Optional[int] = 0
    high_fever: Optional[int] = 0
    chills: Optional[int] = 0
    fatigue: Optional[int] = 0
    runny_nose: Optional[int] = 0
    pain_behind_the_eyes: Optional[int] = 0
    dizziness: Optional[int] = 0
    headache: Optional[int] = 0
    chest_pain: Optional[int] = 0
    vomiting: Optional[int] = 0
    cough: Optional[int] = 0
    shivering: Optional[int] = 0
    asthma_history: Optional[int] = 0
    high_cholesterol: Optional[int] = 0
    diabetes: Optional[int] = 0
    obesity: Optional[int] = 0
    hiv_aids: Optional[int] = 0
    nasal_polyps: Optional[int] = 0
    asthma: Optional[int] = 0
    high_blood_pressure: Optional[int] = 0
    severe_headache: Optional[int] = 0
    weakness: Optional[int] = 0
    trouble_seeing: Optional[int] = 0
    fever: Optional[int] = 0
    body_aches: Optional[int] = 0
    sore_throat: Optional[int] = 0
    sneezing: Optional[int] = 0
    diarrhea: Optional[int] = 0
    rapid_breathing: Optional[int] = 0
    rapid_heart_rate: Optional[int] = 0
    pain_behind_eyes: Optional[int] = 0
    swollen_glands: Optional[int] = 0
    rashes: Optional[int] = 0
    sinus_headache: Optional[int] = 0
    facial_pain: Optional[int] = 0
    shortness_of_breath: Optional[int] = 0
    reduced_smell_and_taste: Optional[int] = 0
    skin_irritation: Optional[int] = 0
    itchiness: Optional[int] = 0
    throbbing_headache: Optional[int] = 0
    confusion: Optional[int] = 0
    back_pain: Optional[int] = 0
    knee_ache: Optional[int] = 0


@app.post("/predict")
def predict(req: PredictRequest):
    data = req.model_dump()
    # pain_behind_eyes is a duplicate key in the training data
    data['pain_behind_eyes'] = data.get('pain_behind_the_eyes', 0)

    X = np.array([[data.get(f, 0) or 0 for f in FEATURE_LIST]])

    proba = xgb_model.predict_proba(X)[0]

    THRESHOLD = 0.15
    predictions = []
    for i, prob in enumerate(proba):
        if prob >= THRESHOLD:
            disease = label_encoder.inverse_transform([i])[0]
            predictions.append({"disease": disease, "confidence": round(float(prob), 3)})

    predictions.sort(key=lambda x: x["confidence"], reverse=True)
    return {"predictions": predictions[:5]}


@app.get("/health")
def health():
    return {"status": "ok"}
