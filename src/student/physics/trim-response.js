// Input angles are supplied in degrees; calculations using Cm_alpha use radians.
// Cm and delta_Cm are dimensionless. Positive alpha and pitching moment are nose-up.
// Assumes a linear, quasi-static Cm-alpha relationship within its stated validity limits.

const assertFiniteNumber = (value, name) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
};

export const degreesToRadians = (degrees) => {
  assertFiniteNumber(degrees, "degrees");
  return degrees * Math.PI / 180;
};

export const calculateCm = (cm0, cmAlphaPerRad, angleOfAttackDeg) => {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");

  const alphaRad = degreesToRadians(angleOfAttackDeg);
  return cm0 + cmAlphaPerRad * alphaRad;
};

export const calculateTrimAngleRad = (cm0, cmAlphaPerRad) => {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  return -cm0 / cmAlphaPerRad;
};

export const calculateTrimAngleDeg = (cm0, cmAlphaPerRad) => {
  const trimAngleRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);

  if (trimAngleRad === null) {
    return null;
  }

  return trimAngleRad * 180 / Math.PI;
};

export const calculateDeltaCm = (
  cmAlphaPerRad,
  disturbanceAlphaDeg
) => {
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  return cmAlphaPerRad * disturbanceAlphaRad;
};

export const classifyDisturbance = (
  disturbanceAlphaDeg,
  deltaCm
) => {
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");
  assertFiniteNumber(deltaCm, "deltaCm");

  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const product = disturbanceAlphaRad * deltaCm;

  if (product < 0) {
    return "restoring";
  }

  if (product > 0) {
    return "destabilizing";
  }

  return "neutral";
};

export const isTrimmed = (cm) => {
  assertFiniteNumber(cm, "cm");
  return Math.abs(cm) <= 1e-6;
};