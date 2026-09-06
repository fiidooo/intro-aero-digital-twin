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

import { feature } from "../../src/student/features/trim-response.feature.js";
import { initialAircraft } from "../../src/core/data/aircraft.js";
import { featureEntries } from "../../src/core/features/index.js";
import { createCapabilityRegistry, modelsForFeature } from "../../src/core/capabilities/capabilityContract.js";
import { capabilityContext } from "../../src/core/simulation/runtime.js";
import { resolveFeatureAnalysis } from "../../src/core/features/featureContract.js";
import { normalizePlot } from "../../src/core/visualization/visualizationContract.js";

function analyzeThroughRuntime(aircraft = initialAircraft) {
  const registry = createCapabilityRegistry(featureEntries);
  expect(registry.issues).toEqual([]);
  const context = capabilityContext(modelsForFeature(feature.id, registry), aircraft);
  return { context, analysis: resolveFeatureAnalysis(feature, aircraft, context) };
}

describe("trim-response dashboard integration", () => {
  it("uses the actual runtime capability map and renders valid results and verification", () => {
    const { context, analysis } = analyzeThroughRuntime();
    expect(context["loads.pitch.component-sum"].version).toBeGreaterThanOrEqual(1);
    expect(analysis.results.find(({ key }) => key === "trimAngleDeg").value).toBeCloseTo(2.86479, 5);
    expect(analysis.results.find(({ key }) => key === "trimmed").value).toBe("not trimmed");
    expect(analysis.results.every(({ value }) => typeof value === "string" || Number.isFinite(value))).toBe(true);
    expect(analysis.verificationCases).toHaveLength(3);
    expect(analysis.verificationCases.every(({ label, passed }) => typeof label === "string" && label.length > 0 && passed === true)).toBe(true);
    expect(analysis.decision.interpretation).toContain("restoring");
  });

  it("keeps the axis labels and zero-moment reference line through plot normalization", () => {
    const { analysis } = analyzeThroughRuntime();
    const plot = normalizePlot(analysis.plots[0]);
    expect(plot.xLabel).toBe("Angle of attack (deg)");
    expect(plot.yLabel).toBe("Pitching-moment coefficient, Cm");
    expect(plot.referenceLines).toEqual(expect.arrayContaining([
      expect.objectContaining({ axis: "y", value: 0, label: "Cm = 0" }),
    ]));
    expect(plot.series[0].points).toEqual(expect.arrayContaining([
      expect.objectContaining({ x: 0, y: 0.04 }),
    ]));
  });

  it("handles zero slope through model evaluation and dashboard analysis without null runtime values", () => {
    const { context, analysis } = analyzeThroughRuntime({ ...initialAircraft, cmAlphaPerRad: 0 });
    expect(context["stability.pitch.cm-alpha"].values.trimAngleDeg).toBe("not available");
    expect(analysis.results.find(({ key }) => key === "trimAngleDeg").value).toBe("not available");
    expect(analysis.results.find(({ key }) => key === "disturbanceTendency").value).toBe("neutral");
  });

  it("reports a missing prerequisite instead of fabricating valid analysis", () => {
    const analysis = resolveFeatureAnalysis(feature, initialAircraft, {});
    expect(analysis.results[0].label).toBe("Analysis unavailable");
    expect(analysis.results[0].note).toBe("Stage 3 loads.pitch.component-sum capability v1 is required.");
    expect(analysis.verificationCases[0].passed).toBe(false);
  });
});
