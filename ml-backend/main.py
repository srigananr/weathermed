import os
import pickle
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'model')

state = {"xgb_model": None, "feature_list": None, "classes": None, "error": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models after the port binds so Render detects the service as alive
    try:
        import xgboost, sklearn
        print(f"Loading models — xgboost={xgboost.__version__} sklearn={sklearn.__version__} numpy={np.__version__}")
        with open(os.path.join(MODEL_DIR, 'xgb_model.pkl'), 'rb') as f:
            state["xgb_model"] = pickle.load(f)
        with open(os.path.join(MODEL_DIR, 'feature_list.pkl'), 'rb') as f:
            state["feature_list"] = pickle.load(f)
        # Class names come directly from the classifier — no label_encoder.pkl needed
        state["classes"] = list(state["xgb_model"].classes_)
        print(f"Models loaded OK. Features: {len(state['feature_list'])}, Classes: {state['classes']}")
    except Exception as e:
        import traceback
        state["error"] = str(e)
        print("MODEL LOAD ERROR:", e)
        traceback.print_exc()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    if state["error"]:
        raise HTTPException(status_code=503, detail=f"Model load failed: {state['error']}")
    if not state["xgb_model"]:
        raise HTTPException(status_code=503, detail="Models not loaded yet")

    data = req.model_dump()
    data['pain_behind_eyes'] = data.get('pain_behind_the_eyes', 0)

    X = np.array([[data.get(f, 0) or 0 for f in state["feature_list"]]])

    proba = state["xgb_model"].predict_proba(X)[0]

    THRESHOLD = 0.15
    predictions = []
    for i, prob in enumerate(proba):
        if prob >= THRESHOLD:
            disease = state["classes"][i]
            predictions.append({"disease": disease, "confidence": round(float(prob), 3)})

    predictions.sort(key=lambda x: x["confidence"], reverse=True)
    return {"predictions": predictions[:5]}


@app.get("/health")
def health():
    return {
        "status": "ok" if state["xgb_model"] else "degraded",
        "models_loaded": state["xgb_model"] is not None and state["classes"] is not None,
        "error": state["error"],
    }
