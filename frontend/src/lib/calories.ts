const CONSERVATIVE_FACTOR = 0.80;

export function calculateCaloriesBurnedFromSteps(
  steps: number,
  weightKg: number
): number {
  const stepsPerMile = 2000;
  const miles = steps / stepsPerMile;
  const caloriesPerMile = weightKg * 0.57;
  const totalCalories = miles * caloriesPerMile;
  return Math.round(totalCalories * CONSERVATIVE_FACTOR);
}

export function calculateCaloriesBurnedFromDuration(
  durationMinutes: number,
  weightKg: number
): number {
  const met = 3.5;
  const caloriesPerMinute = (met * 3.5 * weightKg) / 200;
  const totalCalories = caloriesPerMinute * durationMinutes;
  return Math.round(totalCalories * CONSERVATIVE_FACTOR);
}
