export type Gender = 'female' | 'male' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose' | 'maintain' | 'gain';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

export function calcBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const male   = 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);
  const female = 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
  if (gender === 'male')   return Math.round(male);
  if (gender === 'female') return Math.round(female);
  return Math.round((male + female) / 2);
}

export function calcMaintenance(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

export function calcTarget(maintenance: number, goal: GoalType): number {
  if (goal === 'lose')     return Math.max(1200, maintenance - 500);
  if (goal === 'gain')     return maintenance + 300;
  return maintenance;
}

export function calcProteinGoal(goalWeightKg: number): number {
  return Math.round(goalWeightKg * 1.8);
}

export function kgToLbs(kg: number): number { return Math.round(kg * 2.2046 * 10) / 10; }
export function lbsToKg(lbs: number): number { return Math.round(lbs / 2.2046 * 10) / 10; }
export function cmToFtIn(cm: number): string {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn % 12);
  return `${ft}'${inch}"`;
}
