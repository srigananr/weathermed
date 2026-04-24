import { PREDICT_API_URL } from '../config';
import model from './tree_model.json';

const GENDER_MAP = { male: 0, female: 1, other: 2 };

function traverse(node, features) {
  if (!node || node.type === 'leaf') return node ? node.prediction : null;
  const value = features[node.feature];
  if (value == null || Number.isNaN(value)) return null;
  return value <= node.threshold
    ? traverse(node.left, features)
    : traverse(node.right, features);
}

/**
 * Predicts diseases using XGBoost API (all 50 features).
 * Falls back to the local decision tree + rules when offline.
 *
 * @returns {Promise<string[]>}
 */
export async function predictDisease({
  tempMax, tempMin, weatherCode, humidity, windSpeed, age, gender, symptoms,
}) {
  try {
    const payload = {
      age: age == null ? 0 : Number(age),
      gender: gender == null ? 0 : (GENDER_MAP[String(gender).toLowerCase()] ?? 0),
      temperature_c: (Number(tempMax) + Number(tempMin)) / 2,
      humidity: humidity == null ? 0 : Number(humidity),
      wind_speed_km_h: windSpeed == null ? 0 : Number(windSpeed),
      pain_behind_eyes: symptoms?.pain_behind_the_eyes ? 1 : 0,
    };

    if (symptoms) {
      Object.entries(symptoms).forEach(([key, val]) => {
        payload[key] = val ? 1 : 0;
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${PREDICT_API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const { predictions } = await response.json();
      if (predictions && predictions.length > 0) {
        return predictions.map(p => p.disease);
      }
    }
  } catch (err) {
    console.warn('XGBoost API unavailable, using local tree.', err.message);
  }

  return localPredict({ tempMax, tempMin, weatherCode, humidity, age, gender, symptoms });
}

function localPredict({ tempMax, tempMin, weatherCode, humidity, symptoms }) {
  const normalized = {
    temp_max: Number(tempMax),
    temp_min: Number(tempMin),
    weathercode: Number(weatherCode),
    humidity: humidity == null ? 0 : Number(humidity),
  };
  if (symptoms) {
    Object.entries(symptoms).forEach(([key, val]) => { normalized[key] = val ? 1 : 0; });
  }

  const predictions = [];
  const primary = traverse(model.tree, normalized);
  if (primary) predictions.push(primary);

  const tempAvg = (tempMax + tempMin) / 2;

  if (tempAvg > 35) {
    if (!predictions.includes('Heat Stroke')) predictions.push('Heat Stroke');
    if (!predictions.includes('Dengue') && humidity > 60) predictions.push('Dengue');
  }
  if (tempAvg > 25 && humidity > 65) {
    if (!predictions.includes('Dengue')) predictions.push('Dengue');
    if (!predictions.includes('Malaria')) predictions.push('Malaria');
  }
  if (tempAvg < 10) {
    if (!predictions.includes('Hypothermia')) predictions.push('Hypothermia');
    if (!predictions.includes('Flu')) predictions.push('Flu');
  }
  if (weatherCode >= 51 && weatherCode <= 82) {
    if (!predictions.includes('Common Cold')) predictions.push('Common Cold');
    if (!predictions.includes('Flu') && tempAvg < 20) predictions.push('Flu');
  }
  if (weatherCode === 45 || weatherCode === 48) {
    if (!predictions.includes('Respiratory Issues')) predictions.push('Respiratory Issues');
  }

  const hasFever = symptoms?.high_fever || symptoms?.fever;
  const hasJointPain = symptoms?.joint_pain || symptoms?.body_aches;
  const hasRespiratory = symptoms?.cough || symptoms?.runny_nose || symptoms?.sore_throat;

  if (hasFever && hasJointPain && !predictions.includes('Dengue')) predictions.push('Dengue');
  if (hasRespiratory && tempAvg < 20 && !predictions.includes('Flu')) predictions.push('Flu');

  return predictions.length > 0 ? predictions : ['No disease predicted'];
}
