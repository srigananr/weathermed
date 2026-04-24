import model from './tree_model.json';

function traverse(node, features) {
  if (!node || node.type === 'leaf') {
    return node ? node.prediction : null;
  }

  const value = features[node.feature];
  if (value == null || Number.isNaN(value)) return null;

  if (value <= node.threshold) {
    return traverse(node.left, features);
  }
  return traverse(node.right, features);
}

/**
 * Predicts diseases from weather + user symptom features.
 * Returns multiple possible diseases based on weather conditions and symptoms.
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
 * @returns {string[]} Array of predicted diseases
 */
export function predictDisease({
  tempMax,
  tempMin,
  weatherCode,
  humidity,
  age,
  gender,
  symptoms,
}) {
  const genderMap = {
    male: 0,
    female: 1,
    other: 2,
  };

  const normalized = {
    temp_max: Number(tempMax),
    temp_min: Number(tempMin),
    weathercode: Number(weatherCode),
    humidity: humidity == null ? 0 : Number(humidity),
    age: age == null ? 0 : Number(age),
    gender: gender == null ? 0 : genderMap[gender.toString().toLowerCase()] ?? 0,
  };

  if (symptoms) {
    Object.entries(symptoms).forEach(([key, value]) => {
      normalized[key] = value ? 1 : 0;
    });
  }

  const predictions = [];
  
  // Get the primary prediction from the tree
  const primaryPrediction = traverse(model.tree, normalized);
  if (primaryPrediction) {
    predictions.push(primaryPrediction);
  }

  // Add secondary predictions based on weather conditions
  const tempAvg = (tempMax + tempMin) / 2;

  // High temperature risk
  if (tempAvg > 35) {
    if (!predictions.includes('Heat Stroke')) predictions.push('Heat Stroke');
    if (!predictions.includes('Dengue') && humidity > 60) predictions.push('Dengue');
  }

  // Moderate-high temperature with humidity (mosquito-borne diseases)
  if (tempAvg > 25 && humidity > 65) {
    if (!predictions.includes('Dengue')) predictions.push('Dengue');
    if (!predictions.includes('Malaria')) predictions.push('Malaria');
  }

  // Low temperature risk
  if (tempAvg < 10) {
    if (!predictions.includes('Hypothermia')) predictions.push('Hypothermia');
    if (!predictions.includes('Flu')) predictions.push('Flu');
  }

  // Rainy weather (weather codes 51-82)
  if (weatherCode >= 51 && weatherCode <= 82) {
    if (!predictions.includes('Common Cold')) predictions.push('Common Cold');
    if (!predictions.includes('Flu') && tempAvg < 20) predictions.push('Flu');
  }

  // Fog or low visibility
  if (weatherCode === 45 || weatherCode === 48) {
    if (!predictions.includes('Respiratory Issues')) predictions.push('Respiratory Issues');
  }

  // If user reports high fever or specific symptoms
  const hasFever = symptoms?.high_fever || symptoms?.fever;
  const hasRespiratory = symptoms?.cough || symptoms?.runny_nose || symptoms?.sore_throat;
  const hasJointPain = symptoms?.joint_pain || symptoms?.body_aches;

  if (hasFever && hasJointPain && !predictions.includes('Dengue')) {
    predictions.push('Dengue');
  }

  if (hasRespiratory && tempAvg < 20 && !predictions.includes('Flu')) {
    predictions.push('Flu');
  }

  return predictions.length > 0 ? predictions : ['No disease predicted'];
}
