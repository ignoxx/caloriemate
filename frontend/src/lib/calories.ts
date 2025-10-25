const CONSERVATIVE_FACTOR = 0.80;

export function calculateCaloriesBurnedFromSteps(
  steps: number,
  weightKg: number
): number {
  const avgStrideMeters = 0.700;
  const distanceKm = (steps * avgStrideMeters) / 1000;
  const caloriesPerKm = weightKg * 0.7;
  const totalCalories = distanceKm * caloriesPerKm;
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
