const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema(
  {
    pH: [Number],
    EC: [Number],
    temp: [Number],
    humidity: [Number],
  },
  { _id: false },
);

const sensorIdsSchema = new mongoose.Schema(
  {
    ph_sensor: { type: String, default: "" },
    ec_sensor: { type: String, default: "" },
    temp_sensor: { type: String, default: "" },
    humidity_sensor: { type: String, default: "" },
  },
  { _id: false },
);

const cropStateSchema = new mongoose.Schema({
  crop_id: { type: String, required: true, unique: true },
  crop: String,
  stage: String,
  sequence_number: { type: Number, default: 0 },
  cycle_duration_hours: { type: Number, default: 1 },
  total_crop_lifetime_days: { type: Number, default: 0 },
  planted_at: { type: Date, default: Date.now },
  last_updated: { type: Date, default: Date.now },

  sensors: sensorSchema,

  sensor_ids: { type: sensorIdsSchema, default: () => ({}) },
  location: { type: String, default: "" },
  notes: { type: String, default: "" },
  image_url: { type: String, default: "" },

  action_taken: mongoose.Schema.Types.Mixed,
  outcome: String,
  explanation_log: String,
  bandit_action_id: Number,
  strategic_intent: String,
  reward_score: Number,
  visual_diagnosis: String,

  schema_version: { type: String, default: "1.2" },
});

module.exports = mongoose.model("CropState", cropStateSchema);
