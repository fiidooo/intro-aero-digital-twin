import { describe, expect, it } from "vitest";

import {
  degreesToRadians,
  calculateCm,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  classifyDisturbance,
  isTrimmed,
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  describe("numerical case", () => {
    it("matches the reference calculation within the specified tolerance", () => {
      const cm0 = 0.04;
      const cmAlphaPerRad = -0.8;
      const angleOfAttackDeg = 2.86;
      const disturbanceAlphaDeg = 2.0;
      const tolerance = 0.0001;

      const cm = calculateCm(
        cm0,
        cmAlphaPerRad,
        angleOfAttackDeg
      );

      const trimAngleDeg = calculateTrimAngleDeg(
        cm0,
        cmAlphaPerRad
      );

      const deltaCm = calculateDeltaCm(
        cmAlphaPerRad,
        disturbanceAlphaDeg
      );

      expect(degreesToRadians(2.86)).toBeCloseTo(
        0.049916,
        5
      );

      expect(trimAngleDeg).toBeCloseTo(2.86479, 5);

      expect(
        Math.abs(deltaCm - (-0.028))
      ).toBeLessThanOrEqual(tolerance);

      expect(cm).toBeCloseTo(0.0000669, 7);
      expect(isTrimmed(cm)).toBe(false);

      expect(
        classifyDisturbance(
          disturbanceAlphaDeg,
          deltaCm
        )
      ).toBe("restoring");
    });
  });

  describe("behavioral case", () => {
    it("makes delta_Cm more negative when the positive disturbance increases", () => {
      const cmAlphaPerRad = -0.8;
      const disturbanceAlphaDeg = 3.0;

      const deltaCmAtTwoDegrees = calculateDeltaCm(
        cmAlphaPerRad,
        2.0
      );

      const deltaCmAtThreeDegrees = calculateDeltaCm(
        cmAlphaPerRad,
        disturbanceAlphaDeg
      );

      const expectedDeltaCm = -0.042;

      // The expected behavioral value is rounded to three decimal places.
      // 0.0002 accommodates the rounding difference between -0.0418879...
      // and the specified reference value -0.042.
      const tolerance = 0.0002;

      expect(deltaCmAtThreeDegrees).toBeLessThan(
        deltaCmAtTwoDegrees
      );

      expect(
        Math.abs(deltaCmAtThreeDegrees - expectedDeltaCm)
      ).toBeLessThanOrEqual(tolerance);
    });
  });

  describe("boundary and sanity case", () => {
    it("returns zero disturbance response and no unique trim angle for zero slope", () => {
      const cm0 = 0.04;
      const cmAlphaPerRad = 0;
      const angleOfAttackDeg = 2.86;
      const disturbanceAlphaDeg = 2.0;

      const cm = calculateCm(
        cm0,
        cmAlphaPerRad,
        angleOfAttackDeg
      );

      const trimAngleDeg = calculateTrimAngleDeg(
        cm0,
        cmAlphaPerRad
      );

      const deltaCm = calculateDeltaCm(
        cmAlphaPerRad,
        disturbanceAlphaDeg
      );

      expect(deltaCm).toBe(0);
      expect(trimAngleDeg).toBeNull();
      expect(Number.isFinite(cm)).toBe(true);

      expect(
        classifyDisturbance(
          disturbanceAlphaDeg,
          deltaCm
        )
      ).toBe("neutral");
    });
  });
});
