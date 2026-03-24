"""Train an XGBoost classifier to predict disease from weather + symptom data.

Usage:
  python scripts/train_model.py

It expects a CSV at data/disease_weather.csv.
Column names are normalised automatically (spaces/special chars → underscores).
The target column must be named 'disease' or 'prognosis'.

It writes:
  model/xgb_model.pkl        — trained XGBoost classifier
  model/label_encoder.pkl    — fitted LabelEncoder for disease classes
  model/feature_list.pkl     — ordered list of normalised feature names expected at inference
"""

import os

import joblib
import pandas as pd
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PATH = os.path.join(ROOT, "data", "disease_weather.csv")
MODEL_DIR = os.path.join(ROOT, "model")
MODEL_PATH = os.path.join(MODEL_DIR, "xgb_model.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "feature_list.pkl")


def normalize_value(val):
    if pd.isna(val):
        return float("nan")
    if isinstance(val, str):
        v = val.strip().lower()
        if v in ("yes", "true", "1"):
            return 1.0
        if v in ("no", "false", "0"):
            return 0.0
        try:
            return float(v)
        except ValueError:
            return float("nan")
    if isinstance(val, bool):
        return 1.0 if val else 0.0
    return float(val)


def main():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Expected dataset at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    # Normalise column names: lowercase, replace spaces and special chars with underscores
    df.columns = (
        df.columns.str.strip()
        .str.lower()
        .str.replace(r"[^\w]", "_", regex=True)
        .str.replace(r"_+", "_", regex=True)
        .str.strip("_")
    )

    if "disease" in df.columns:
        target_col = "disease"
    elif "prognosis" in df.columns:
        target_col = "prognosis"
    else:
        raise ValueError('Dataset must contain a "disease" or "prognosis" column.')

    features = [c for c in df.columns if c != target_col]
    if not features:
        raise ValueError("No feature columns found in dataset.")

    print(f"Features ({len(features)}): {features}")

    X = df[features].apply(lambda col: col.map(normalize_value)).fillna(0)
    y = df[target_col].astype(str)

    # Drop disease classes with fewer than 2 samples (can't split them)
    class_counts = y.value_counts()
    valid_classes = class_counts[class_counts >= 2].index
    mask = y.isin(valid_classes)
    X = X[mask]
    y = y[mask]
    if mask.sum() < len(mask):
        dropped = class_counts[class_counts < 2].index.tolist()
        print(f"Dropped {len(dropped)} class(es) with < 2 samples: {dropped}")

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    clf = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        eval_metric="mlogloss",
        random_state=42,
    )

    # Only do a train/test split if we have enough samples per class
    min_class_count = pd.Series(y_enc).value_counts().min()
    n_classes = len(le.classes_)
    if len(X) >= n_classes * 5:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
        )
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        print("\n=== Evaluation on held-out test set ===")
        print(classification_report(y_test, y_pred, target_names=le.classes_))
    else:
        print(f"\nDataset too small ({len(X)} rows, {n_classes} classes) — training on full data, skipping eval split.")
        clf.fit(X, y_enc)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(clf, MODEL_PATH)
    joblib.dump(le, ENCODER_PATH)
    joblib.dump(features, FEATURES_PATH)

    print(f"\nModel saved to      {MODEL_PATH}")
    print(f"Label encoder saved to {ENCODER_PATH}")
    print(f"Feature list saved to  {FEATURES_PATH}")


if __name__ == "__main__":
    main()
