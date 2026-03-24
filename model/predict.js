import { PREDICT_API_URL } from '../config';

const PREDICT_BASE_URL = PREDICT_API_URL;

/**
 * Predicts diseases from weather + user symptom features.
 *
 * @param {{
 *   tempMax: number,
 *   tempMin: number,
 *   weatherCode: number,
 *   humidity: number,
 *   age?: number,
 *   gender?: string,
 *   symptoms?: Record<string, boolean>
 * }} features
 * @returns {Promise<string[]>} Ordered array of predicted disease names
 */
export async function predictDisease({
  tempMax,
  tempMin,
  weatherCode,
  humidity,
  age,
  gender,
  symptoms,
}) {
  const genderMap = { male: 1, female: 0, other: 0 };

  // Field names must match the normalised column names from the training dataset
  const payload = {
    age: age == null ? 0 : Number(age),
    gender: gender == null ? 0 : (genderMap[gender.toString().toLowerCase()] ?? 0),
    temperature_c: tempMax != null && tempMin != null
      ? (Number(tempMax) + Number(tempMin)) / 2
      : Number(tempMax ?? tempMin ?? 25),
    humidity: humidity == null ? 0 : Number(humidity),
    wind_speed_km_h: 0,
  };

  if (symptoms) {
    Object.entries(symptoms).forEach(([key, value]) => {
      payload[key] = value ? 1 : 0;
    });
  }

  try {
    const response = await fetch(`${PREDICT_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Prediction API responded with status ${response.status}`);
    }

    const { predictions } = await response.json();
    return predictions.map((p) => p.disease);
  } catch (error) {
    console.warn('Prediction API unavailable, falling back to rule-based prediction.', error);
    return fallbackPredict({ tempMax, tempMin, weatherCode, humidity });
  }
}

/**
 * Rule-based fallback used when the prediction API is unreachable.
 */
function fallbackPredict({ tempMax, tempMin, weatherCode, humidity }) {
  const predictions = [];
  const tempAvg = (tempMax + tempMin) / 2;

  if (tempAvg > 35) {
    predictions.push('Heat Stroke');
    if (humidity > 60) predictions.push('Dengue');
  }
  if (tempAvg > 25 && humidity > 65) {
    if (!predictions.includes('Dengue')) predictions.push('Dengue');
    predictions.push('Malaria');
  }
  if (tempAvg < 10) {
    predictions.push('Hypothermia');
    predictions.push('Flu');
  }
  if (weatherCode >= 51 && weatherCode <= 82) {
    predictions.push('Common Cold');
    if (tempAvg < 20 && !predictions.includes('Flu')) predictions.push('Flu');
  }
  if (weatherCode === 45 || weatherCode === 48) {
    predictions.push('Respiratory Issues');
  }

  return predictions.length > 0 ? predictions : ['No disease predicted'];
}
