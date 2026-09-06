import {
  calculateCm,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  classifyDisturbance,
  isTrimmed,
} from "../physics/trim-response.js";

const REQUIRED_CAPABILITY_ID = "loads.pitch.component-sum";
const REQUIRED_CAPABILITY_VERSION = 1;

const hasRequiredCapability = (capabilityContext) => {
  const capability = capabilityContext?.[REQUIRED_CAPABILITY_ID];
  return Number(capability?.version) >= REQUIRED_CAPABILITY_VERSION;
};

const createResult = ({
  key,
  label,
  value,
  unit = "",
  precision = 4,
  emphasis = false,
}) => ({
  key,
  label,
  value,
  unit,
  precision,
  ...(emphasis ? { emphasis: true } : {}),
});

const buildPlotPoints = (cm0, cmAlphaPerRad, selectedAngleDeg) => {
  const angles = [];

  for (let angle = -10; angle <= 10; angle += 1) {
    angles.push(angle);
  }

  if (selectedAngleDeg >= -10 && selectedAngleDeg <= 10) {
    angles.push(selectedAngleDeg);
  }

  const uniqueAngles = [...new Set(angles)].sort((a, b) => a - b);

  return uniqueAngles.map((angleDeg) => ({
    x: angleDeg,
    y: calculateCm(cm0, cmAlphaPerRad, angleDeg),
  }));
};

const numericalVerification = () => {
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

  return {
    id: "numerical",
    label: "Numerical case",
    inputs: {
      cm0,
      cmAlphaPerRad,
      angleOfAttackDeg,
      disturbanceAlphaDeg,
    },
    expected: {
      trimAngleDeg: 2.86479,
      deltaCm: -0.028,
      selectedCondition: "not trimmed",
      disturbanceTendency: "restoring",
    },
    tolerance,
    passed:
      Math.abs(trimAngleDeg - 2.86479) <= tolerance &&
      Math.abs(deltaCm - (-0.028)) <= tolerance &&
      isTrimmed(cm) === false &&
      classifyDisturbance(disturbanceAlphaDeg, deltaCm) === "restoring",
  };
};

const behavioralVerification = () => {
  const cmAlphaPerRad = -0.8;
  const disturbanceAlphaDeg = 3.0;
  const expectedDeltaCm = -0.042;
  // The reference is rounded; match the justified tolerance in the physics test.
  const tolerance = 0.0002;

  const deltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );

  const originalDeltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    2.0
  );

  return {
    id: "behavioral",
    label: "Behavioral case",
    inputs: {
      cmAlphaPerRad,
      disturbanceAlphaDeg,
    },
    expected: {
      trend: "delta_Cm becomes more negative",
      deltaCm: expectedDeltaCm,
    },
    tolerance,
    passed:
      deltaCm < originalDeltaCm &&
      Math.abs(deltaCm - expectedDeltaCm) <= tolerance,
  };
};

const boundaryVerification = () => {
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

  return {
    id: "boundary",
    label: "Boundary/sanity case",
    inputs: {
      cm0,
      cmAlphaPerRad,
      angleOfAttackDeg,
      disturbanceAlphaDeg,
    },
    expected: {
      deltaCm: 0,
      trimAngle: "not available",
      reason: "Cm_alpha = 0 provides no unique trim angle.",
    },
    passed:
      deltaCm === 0 &&
      trimAngleDeg === null &&
      classifyDisturbance(disturbanceAlphaDeg, deltaCm) === "neutral" &&
      Number.isFinite(cm),
  };
};

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluate the linear pitching-moment relationship, trim angle, and disturbance tendency.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg",
  ],
  requiresCapabilities: [
    {
      id: "loads.pitch.component-sum",
      version: 1,
    },
  ],
  providesCapabilities: [
    {
      id: "stability.pitch.cm-alpha",
      version: 1,
    },
  ],
  assumptions: [
    "The Cm-alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],
  validityLimits: [
    "Do not use this linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "This model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency in this model is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle.",
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {},
  },

  analyze(aircraft, capabilityContext) {
    if (!hasRequiredCapability(capabilityContext)) {
      throw new TypeError("Stage 3 loads.pitch.component-sum capability v1 is required.");
    }

    const {
      cm0,
      cmAlphaPerRad,
      angleOfAttackDeg,
      disturbanceAlphaDeg,
    } = aircraft;

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

    const trimmed = isTrimmed(cm);
    const tendency = classifyDisturbance(
      disturbanceAlphaDeg,
      deltaCm
    );

    const trimResultValue =
      trimAngleDeg === null ? "not available" : trimAngleDeg;

    return {
      results: [
        createResult({
          key: "cm",
          label: "Pitching-moment coefficient at selected angle",
          value: cm,
          unit: "",
          precision: 7,
          emphasis: true,
        }),
        createResult({
          key: "trimAngleDeg",
          label: "Trim angle",
          value: trimResultValue,
          unit: "deg",
          precision: 5,
        }),
        createResult({
          key: "deltaCm",
          label: "Disturbance moment-coefficient change",
          value: deltaCm,
          unit: "",
          precision: 4,
        }),
        createResult({
          key: "trimmed",
          label: "Selected condition trimmed",
          value: trimmed ? "trimmed" : "not trimmed",
          unit: "",
          precision: 0,
        }),
        createResult({
          key: "disturbanceTendency",
          label: "Disturbance tendency",
          value: tendency,
          unit: "",
          precision: 0,
        }),
      ],

      verificationCases: [
        numericalVerification(),
        behavioralVerification(),
        boundaryVerification(),
      ],

      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation:
          trimmed
            ? `The selected condition is trimmed under the specified |Cm(alpha)| <= 1e-6 criterion, and the disturbance has a ${tendency} tendency under this linear quasi-static model.`
            : `The selected condition is not trimmed under the specified |Cm(alpha)| <= 1e-6 criterion. The disturbance has a ${tendency} tendency under this linear quasi-static model. This result does not establish safety, controllability, or flightworthiness.`,
        status: "neutral",
      },

      plots: [
        {
          id: "cm-alpha",
          title: "Cm–alpha relationship",
          xLabel: "Angle of attack (deg)",
          yLabel: "Pitching-moment coefficient, Cm",
          currentX: angleOfAttackDeg,
          series: [
            {
              id: "cm-alpha",
              label: "Cm(alpha)",
              points: buildPlotPoints(
                cm0,
                cmAlphaPerRad,
                angleOfAttackDeg
              ),
            },
          ],
          regions: [],
          referenceLines: [
            {
              id: "trim-line",
              label: "Cm = 0",
              axis: "y",
              value: 0,
            },
          ],
        },
      ],

      scene: null,
    };
  },
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft;

    if (!aircraft) {
      return {
        values: {},
      };
    }

    const cm = calculateCm(
      aircraft.cm0,
      aircraft.cmAlphaPerRad,
      aircraft.angleOfAttackDeg
    );

    const trimAngleDeg = calculateTrimAngleDeg(
      aircraft.cm0,
      aircraft.cmAlphaPerRad
    );

    const deltaCm = calculateDeltaCm(
      aircraft.cmAlphaPerRad,
      aircraft.disturbanceAlphaDeg
    );

    return {
      values: {
        cm,
        trimAngleDeg: trimAngleDeg === null ? "not available" : trimAngleDeg,
        deltaCm,
        trimmed: isTrimmed(cm),
        disturbanceTendency: classifyDisturbance(
          aircraft.disturbanceAlphaDeg,
          deltaCm
        ),
      },
    };
  },
};