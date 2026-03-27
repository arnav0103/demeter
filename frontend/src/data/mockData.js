// MOCK DATA
// -- Set USE_MOCK_DATA = true to use local test data
// -- Set USE_MOCK_DATA = false to connect to the real backend API
export const USE_MOCK_DATA = false;

// HELPERS
const ts = (daysAgo, hour = 10, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

const plantedTs = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

// Explanation log samples
const EXPLANATION_LOGS = {
  lettuce: `1. **Observation**: Sensors show pH 6.1, EC 1.4 dS/m, Temp 23.5°C, Humidity 68%.
   All parameters are within acceptable range for Vegetative Lettuce.

2. **Precedent**: 3 similar past states found. In 2 of those cases, a slight EC boost
   improved growth rate by +12%. No disease was detected in the last 5 cycles.

3. **Logic**: EC at 1.4 is slightly below the 1.5-1.8 target for late vegetative.
   A small nutrient dosage increase will push it into the optimal window.
   Fan speed is adequate; no VPD concerns at current temp/humidity.

4. **Conclusion**: Dosing 2.5ml nutrients is the safest, most targeted intervention.
   No pH correction needed. Maintain current atmospheric settings.`,

  tomato: `1. **Observation**: pH 5.8, EC 2.1 dS/m, Temp 26°C, Humidity 58%.
   EC is elevated for flowering stage - approaching upper safe limit of 2.2.

2. **Precedent**: 2 similar flowering Tomato states found. In one prior case,
   EC > 2.2 triggered blossom drop. Acid dosage was effective in 1 case.

3. **Logic**: pH 5.8 is at the lower end for Tomato flowering (optimal 6.0-6.5).
   A controlled acid dose of 1.5ml will bring pH down slightly to 5.9,
   while nutrient top-up at 4ml maintains bloom support without pushing EC over limit.

4. **Conclusion**: Targeted acid dosage + nutrient boost is the correct intervention.
   Increased fan speed to 60% to manage VPD in warm conditions.`,

  basil: `1. **Observation**: CRITICAL - pH 7.8 (target 5.5-6.5), EC 0.6 (very low), Temp 29.5°C.
   Multiple out-of-range parameters detected simultaneously.

2. **Precedent**: 1 similar critical Basil state found. Previous corrective action
   required 8ml acid dosage to restore pH. Recovery took 2 cycles.

3. **Logic**: pH 7.8 indicates severe alkalinity - likely nutrient lockout.
   At this pH, iron and manganese become unavailable causing yellowing.
   EC 0.6 confirms nutrient starvation. Aggressive correction required.
   High temp (29.5°C) increases risk of bolting.

4. **Conclusion**: Emergency acid dosage (8ml) is necessary. Fan at 80% to cool.
   Nutrient addition deferred until pH stabilizes to avoid compounding stress.`,

  strawberry: `1. **Observation**: pH 6.2, EC 1.8 dS/m, Temp 22°C, Humidity 65%.
   All parameters within optimal range for Strawberry Vegetative stage.

2. **Precedent**: 4 similar states found, all showing positive outcomes.
   Gentle interventions in this range historically improve runner production by 10-18%.

3. **Logic**: Conditions are near-ideal. pH 6.2 is perfect for Strawberry (optimal 6.0-6.5).
   Light nutrient boost (1.5ml) maintains EC momentum. Water refill supports
   root zone hydration without diluting nutrients significantly.

4. **Conclusion**: Minimal intervention strategy. 1.5ml nutrient + 1.5L water refill.
   Fan at 40% maintains gentle airflow - adequate for cooler Strawberry environment.`,
};

/**
 * MOCK_DASHBOARD - Raw MongoDB document shape
 * (sensors as arrays, planted_at, cycle_duration_hours, sensor_ids, location)
 */
export const MOCK_DASHBOARD = [
  {
    _id: "mongo-001",
    crop_id: "Batch_Lettuce_2025A",
    crop: "Lettuce",
    stage: "vegetative",
    sequence_number: 14,
    cycle_duration_hours: 1,
    planted_at: plantedTs(10),
    last_updated: ts(0, 9, 30),
    location: "Rack A - Shelf 1",
    notes: "Fast-growing batch, increased EC slightly on day 7.",
    image_url: "",
    sensors: {
      pH: [5.9, 6.0, 6.1, 6.1],
      EC: [1.3, 1.4, 1.4, 1.4],
      temp: [23.0, 23.5, 23.5, 23.5],
      humidity: [66, 67, 68, 68],
    },
    sensor_ids: {
      ph_sensor: "PH-SEN-A1F3",
      ec_sensor: "EC-SEN-B2D7",
      temp_sensor: "TMP-SEN-C4E9",
      humidity_sensor: "HUM-SEN-D6F1",
    },
    action_taken: JSON.stringify({
      acid_dosage_ml: 0,
      base_dosage_ml: 0,
      nutrient_dosage_ml: 2.5,
      fan_speed_pct: 45,
      water_refill_l: 0,
    }),
    outcome: "IMPROVED | Reward: 0.8",
    strategic_intent: "MAINTAIN_CURRENT",
    bandit_action_id: 0,
    reward_score: 0.8,
    explanation_log: EXPLANATION_LOGS.lettuce,
  },
  {
    _id: "mongo-002",
    crop_id: "Batch_Tomato_2025B",
    crop: "Tomato",
    stage: "flowering",
    sequence_number: 22,
    cycle_duration_hours: 2,
    planted_at: plantedTs(45),
    last_updated: ts(0, 8, 15),
    location: "Rack B - Shelf 2",
    notes: "",
    image_url: "",
    sensors: {
      pH: [5.7, 5.8, 5.8, 5.8],
      EC: [2.0, 2.1, 2.1, 2.1],
      temp: [25.5, 26.0, 26.0, 26.0],
      humidity: [57, 58, 58, 58],
    },
    sensor_ids: {
      ph_sensor: "PH-SEN-E5A2",
      ec_sensor: "EC-SEN-F3C8",
      temp_sensor: "TMP-SEN-G7D1",
      humidity_sensor: "HUM-SEN-H9B4",
    },
    action_taken: JSON.stringify({
      acid_dosage_ml: 1.5,
      base_dosage_ml: 0,
      nutrient_dosage_ml: 4.0,
      fan_speed_pct: 60,
      water_refill_l: 0,
    }),
    outcome: "STABLE | Reward: 0.4",
    strategic_intent: "INCREASE_EC_BLOOM",
    bandit_action_id: 6,
    reward_score: 0.4,
    explanation_log: EXPLANATION_LOGS.tomato,
  },
  {
    _id: "mongo-003",
    crop_id: "Batch_Basil_2025C",
    crop: "Basil",
    stage: "seedling",
    sequence_number: 5,
    cycle_duration_hours: 1,
    planted_at: plantedTs(3),
    last_updated: ts(0, 11, 0),
    location: "Rack A - Shelf 3",
    notes: "New batch - watching pH closely.",
    image_url: "",
    sensors: {
      pH: [7.5, 7.7, 7.8, 7.8],
      EC: [0.7, 0.6, 0.6, 0.6],
      temp: [28.5, 29.0, 29.5, 29.5],
      humidity: [80, 81, 82, 82],
    },
    sensor_ids: {
      ph_sensor: "PH-SEN-I2K6",
      ec_sensor: "EC-SEN-J4L9",
      temp_sensor: "TMP-SEN-K1M3",
      humidity_sensor: "HUM-SEN-L8N7",
    },
    action_taken: JSON.stringify({
      acid_dosage_ml: 8.0,
      base_dosage_ml: 0,
      nutrient_dosage_ml: 3.0,
      fan_speed_pct: 80,
      water_refill_l: 0,
    }),
    outcome: "DETERIORATED | Reward: -0.6",
    strategic_intent: "AGGRESSIVE_PH_DOWN",
    bandit_action_id: 2,
    reward_score: -0.6,
    explanation_log: EXPLANATION_LOGS.basil,
  },
  {
    _id: "mongo-004",
    crop_id: "Batch_Strawberry_2025D",
    crop: "Strawberry",
    stage: "vegetative",
    sequence_number: 9,
    cycle_duration_hours: 2,
    planted_at: plantedTs(18),
    last_updated: ts(1, 14, 45),
    location: "Rack C - Shelf 1",
    notes: "Runner training started on day 12.",
    image_url: "",
    sensors: {
      pH: [6.1, 6.2, 6.2, 6.2],
      EC: [1.7, 1.8, 1.8, 1.8],
      temp: [21.5, 22.0, 22.0, 22.0],
      humidity: [63, 64, 65, 65],
    },
    sensor_ids: {
      ph_sensor: "PH-SEN-M5P2",
      ec_sensor: "EC-SEN-N7Q4",
      temp_sensor: "TMP-SEN-O3R8",
      humidity_sensor: "HUM-SEN-P1S6",
    },
    action_taken: JSON.stringify({
      acid_dosage_ml: 0,
      base_dosage_ml: 0,
      nutrient_dosage_ml: 1.5,
      fan_speed_pct: 40,
      water_refill_l: 1.5,
    }),
    outcome: "IMPROVED | Reward: 0.7",
    strategic_intent: "GENTLE_PH_BALANCING",
    bandit_action_id: 4,
    reward_score: 0.7,
    explanation_log: EXPLANATION_LOGS.strawberry,
  },
];

// Detailed history per crop (multiple snapshots - keeps Qdrant/payload shape for analytics)
function makeHistory(cropId, cropName, stage, n, baseVals, explanationLog) {
  return Array.from({ length: n }, (_, i) => {
    const jitter = (range) => (Math.random() - 0.5) * range;
    return {
      id: `${cropId}-seq-${i + 1}`,
      payload: {
        crop_id: cropId,
        crop: cropName,
        stage,
        sequence_number: i + 1,
        timestamp: ts(Math.floor((n - i) / 3), (i * 2) % 24, (i * 7) % 60),
        sensors: {
          pH: +(baseVals.ph + jitter(0.4)).toFixed(2),
          EC: +(baseVals.ec + jitter(0.3)).toFixed(2),
          temp: +(baseVals.temp + jitter(2)).toFixed(1),
          humidity: +(baseVals.humidity + jitter(8)).toFixed(1),
        },
        action_taken: JSON.stringify({
          acid_dosage_ml: +(Math.random() * 2).toFixed(1),
          base_dosage_ml: 0,
          nutrient_dosage_ml: +(Math.random() * 3 + 1).toFixed(1),
          fan_speed_pct: Math.round(30 + Math.random() * 40),
          water_refill_l: +(Math.random() * 2).toFixed(1),
        }),
        outcome: [
          "IMPROVED | Reward: 0.7",
          "STABLE | Reward: 0.4",
          "DETERIORATED | Reward: -0.3",
        ][i % 3],
        strategic_intent: [
          "MAINTAIN_CURRENT",
          "GENTLE_PH_BALANCING",
          "INCREASE_EC_VEG",
        ][i % 3],
        reward_score: [0.7, 0.4, -0.3][i % 3],
        explanation_log: explanationLog,
      },
    };
  });
}

export const MOCK_HISTORY = [
  ...makeHistory(
    "Batch_Lettuce_2025A",
    "Lettuce",
    "vegetative",
    14,
    { ph: 6.1, ec: 1.4, temp: 23.5, humidity: 68 },
    EXPLANATION_LOGS.lettuce,
  ),
  ...makeHistory(
    "Batch_Tomato_2025B",
    "Tomato",
    "flowering",
    22,
    { ph: 5.8, ec: 2.1, temp: 26.0, humidity: 58 },
    EXPLANATION_LOGS.tomato,
  ),
  ...makeHistory(
    "Batch_Basil_2025C",
    "Basil",
    "seedling",
    5,
    { ph: 7.8, ec: 0.6, temp: 29.5, humidity: 82 },
    EXPLANATION_LOGS.basil,
  ),
  ...makeHistory(
    "Batch_Strawberry_2025D",
    "Strawberry",
    "vegetative",
    9,
    { ph: 6.2, ec: 1.8, temp: 22.0, humidity: 65 },
    EXPLANATION_LOGS.strawberry,
  ),
];

// Mock search result (for FarmIntelligence)
export const MOCK_SEARCH_RESULT = {
  status: "success",
  results: MOCK_DASHBOARD.slice(0, 2).map((d, i) => ({
    id: d._id,
    score: 0.95 - i * 0.08,
    payload: { ...d, sensors: { pH: 6.1, EC: 1.4, temp: 23.5, humidity: 68 } },
  })),
  query_logic: { must: [{ key: "crop", match: "Lettuce" }] },
};
