const DROWSY_PERCLOS_THRESHOLD = 0.2;
const MIN_SCORE_SAMPLES = 30;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const getEyeClosure = (blendshapes) => {
  const categories = blendshapes?.[0]?.categories;
  const left = categories?.find((category) => category.categoryName === 'eyeBlinkLeft')?.score;
  const right = categories?.find((category) => category.categoryName === 'eyeBlinkRight')?.score;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return (left + right) / 2;
};

export const calculateAlertness = (samples) => {
  if (samples.length < MIN_SCORE_SAMPLES) return null;
  const perclos = samples.filter((sample) => sample.closed).length / samples.length;
  return clamp(1 - perclos / DROWSY_PERCLOS_THRESHOLD, 0, 1);
};
