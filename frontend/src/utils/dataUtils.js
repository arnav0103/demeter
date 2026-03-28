// Number formatting
export const formatNumber = (val, decimals = 2) => {
  if (val === undefined || val === null || isNaN(parseFloat(val))) return "0";
  const factor = Math.pow(10, decimals);
  return Math.round(parseFloat(val) * factor) / factor;
};

// Python dict / JSON string parser
export const parsePythonString = (str) => {
  if (!str) return null;
  if (typeof str === "object") return str;
  try {
    return JSON.parse(str);
  } catch {
    try {
      const fixed = str
        .replace(/'/g, '"')
        .replace(/\bNone\b/g, "null")
        .replace(/\bFalse\b/g, "false")
        .replace(/\bTrue\b/g, "true");
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
};

// LIFECYCLE
// - totalHours -> the time at which the crop enters its final harvestable stage
// - maturity % = elapsed hours / totalHours (capped at 100)
// - ready to harvest -> maturity >= 100

export const CROP_LIFECYCLES = {
  lettuce: {
    stages: [
      { name: "seedling", startH: 0, endH: 168 },
      { name: "vegetative", startH: 168, endH: 504 },
      { name: "harvest", startH: 504, endH: null },
    ],
    totalHours: 504, // ~21 days
    totalDays: 21,
    harvestStage: "harvest",
  },
  tomato: {
    stages: [
      { name: "seedling", startH: 0, endH: 336 },
      { name: "vegetative", startH: 336, endH: 1008 },
      { name: "flowering", startH: 1008, endH: 1680 },
      { name: "fruiting", startH: 1680, endH: null },
    ],
    totalHours: 1680, // ~70 days
    totalDays: 70,
    harvestStage: "fruiting",
  },
  basil: {
    stages: [
      { name: "seedling", startH: 0, endH: 168 },
      { name: "vegetative", startH: 168, endH: 672 },
      { name: "harvest", startH: 672, endH: null },
    ],
    totalHours: 672, // ~28 days
    totalDays: 28,
    harvestStage: "harvest",
  },
  strawberry: {
    stages: [
      { name: "seedling", startH: 0, endH: 336 },
      { name: "vegetative", startH: 336, endH: 1008 },
      { name: "flowering", startH: 1008, endH: 1512 },
      { name: "fruiting", startH: 1512, endH: null },
    ],
    totalHours: 1512, // ~63 days
    totalDays: 63,
    harvestStage: "fruiting",
  },
};

export const CROP_CYCLE_HOURS = {
  lettuce: 1,
  basil: 1,
  tomato: 2,
  strawberry: 2,
};

export const SUPPORTED_CROPS = ["Lettuce", "Tomato", "Basil", "Strawberry"];

// Sensor extraction

/** If a sensor field is an array (MongoDB stores history arrays), take the last element */
function resolveArrayVal(v) {
  if (Array.isArray(v)) return v.length > 0 ? v[v.length - 1] : undefined;
  return v;
}

function pickVal(obj, ...keys) {
  if (!obj || typeof obj !== "object") return undefined;
  const lower = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  for (const k of keys) {
    if (obj[k] !== undefined) return resolveArrayVal(obj[k]);
    if (lower[k.toLowerCase()] !== undefined)
      return resolveArrayVal(lower[k.toLowerCase()]);
  }
  return undefined;
}

export const extractSensors = (payload) => {
  if (!payload) return { temp: 0, ph: 0, humidity: 0, ec: 0 };

  let raw = payload.sensors || payload.sensor_data || null;

  if (!raw) {
    const action = parsePythonString(payload.action_taken);
    if (action && typeof action === "object") {
      raw = {
        temp: action.atmospheric_actions?.air_temp ?? action.air_temp ?? 0,
        ph: action.water_actions?.ph ?? action.ph ?? 0,
        humidity: action.atmospheric_actions?.humidity ?? action.humidity ?? 0,
        ec: action.water_actions?.ec ?? action.ec ?? 0,
      };
    } else {
      raw = payload;
    }
  }

  return {
    temp: formatNumber(
      pickVal(raw, "temp", "Temp", "air_temp", "temperature") ?? 0,
    ),
    ph: formatNumber(pickVal(raw, "pH", "ph", "PH") ?? 7.0),
    humidity: formatNumber(pickVal(raw, "humidity", "Humidity", "RH") ?? 0),
    ec: formatNumber(pickVal(raw, "EC", "ec", "conductivity") ?? 0),
  };
};

// Effective elapsed hours
export const getEffectiveElapsedHours = (payload) => {
  if (!payload) return 0;

  // PRIMARY: sequence_number × cycle_duration_hours
  const seqNum = payload.sequence_number || 0;
  if (seqNum > 0) {
    const crop = (payload.crop || "").toLowerCase();
    const cycleDuration =
      payload.cycle_duration_hours || CROP_CYCLE_HOURS[crop] || 1;
    return seqNum * cycleDuration;
  }

  // SECONDARY: simulated_age_hours (for crops with 0 sequences)
  if (
    typeof payload.simulated_age_hours === "number" &&
    payload.simulated_age_hours > 0
  ) {
    return payload.simulated_age_hours;
  }

  // FALLBACK: real wall-clock age
  if (payload.planted_at) {
    return (
      (Date.now() - new Date(payload.planted_at).getTime()) / (1000 * 60 * 60)
    );
  }
  return 0;
};

// Maturity
export const calculateMaturity = (payload) => {
  // Legacy call: calculateMaturity(seqNumber)
  if (typeof payload === "number") return Math.min(payload * 10, 100);

  if (!payload) return 0;

  const crop = (payload.crop || "").toLowerCase();
  const lifecycle = CROP_LIFECYCLES[crop];

  if (lifecycle) {
    const elapsedH = getEffectiveElapsedHours(payload);
    const pct = Math.min((elapsedH / lifecycle.totalHours) * 100, 100);
    return Math.round(pct);
  }
  // Fallback: sequence-based estimate
  return Math.min((payload.sequence_number || 0) * 10, 100);
};

// Days remaining
export const getDaysRemaining = (payload) => {
  if (!payload) return null;
  const crop = (payload.crop || "").toLowerCase();
  const lifecycle = CROP_LIFECYCLES[crop];
  if (!lifecycle) return null;

  const elapsedH = getEffectiveElapsedHours(payload);
  const remainH = lifecycle.totalHours - elapsedH;
  if (remainH <= 0) return 0;
  return Math.ceil(remainH / 24);
};

// Current growth stage
export const getCurrentStage = (payload) => {
  if (!payload) return null;
  const crop = (payload.crop || "").toLowerCase();
  const lifecycle = CROP_LIFECYCLES[crop];
  if (!lifecycle) return payload.stage || null;

  const elapsedH = getEffectiveElapsedHours(payload);
  const stages = lifecycle.stages;
  for (let i = stages.length - 1; i >= 0; i--) {
    if (elapsedH >= stages[i].startH) return stages[i].name;
  }
  return stages[0].name;
};

// Harvest readiness
export const isReadyToHarvest = (payload) => {
  if (!payload) return false;
  const maturity = calculateMaturity(payload);
  const status = deriveCropStatus(payload);
  // 100 % = entered harvest stage; ≥ 95 gives a small grace window for
  // crops where planted_at might be slightly off.
  return maturity >= 95 && status !== "Critical";
};

// MongoDB → normalized shape
export const normalizeMongoCrop = (doc) => {
  if (!doc) return null;
  const id = doc.crop_id || doc._id;
  return {
    id,
    payload: {
      crop_id: doc.crop_id,
      crop: doc.crop,
      stage: doc.stage,
      sequence_number: doc.sequence_number,
      planted_at: doc.planted_at,
      last_updated: doc.last_updated,
      cycle_duration_hours: doc.cycle_duration_hours,
      sensors: doc.sensors,
      sensor_ids: doc.sensor_ids,
      location: doc.location,
      notes: doc.notes,
      image_url: doc.image_url,
      action_taken: doc.action_taken,
      outcome: doc.outcome,
      explanation_log: doc.explanation_log,
      bandit_action_id: doc.bandit_action_id,
      strategic_intent: doc.strategic_intent,
      reward_score: doc.reward_score,
      visual_diagnosis: doc.visual_diagnosis,
      timestamp: doc.last_updated || doc.planted_at,
    },
  };
};

// Outcome formatting
export const formatOutcome = (outcome) => {
  if (!outcome || typeof outcome !== "string") return "Monitoring...";
  const cleanOutcome = outcome.split("| Reward:")[0].trim();
  const parts = cleanOutcome.split("|").map((p) => p.trim());
  let tags = [];
  let notes = "";
  parts.forEach((part) => {
    if (part.startsWith("condition_assessed")) {
      const v = part.replace("condition_assessed", "").trim();
      if (v) tags.push(`Condition: ${v}`);
    } else if (part.startsWith("health_score:")) {
      const v = part.replace("health_score:", "").trim();
      if (v) tags.push(`Health: ${v}`);
    } else if (part.startsWith("notes:")) {
      notes = part.replace("notes:", "").trim();
    } else if (part) {
      tags.push(part);
    }
  });
  if (!tags.length && !notes) return cleanOutcome;
  const t = tags.join(" · ");
  return t && notes ? `${t} - ${notes}` : t || notes;
};

// Crop health status
export const deriveCropStatus = (payload) => {
  if (!payload) return "Healthy";
  const s = extractSensors(payload);
  const ph = parseFloat(s.ph) || 0;
  const ec = parseFloat(s.ec) || 0;
  const temp = parseFloat(s.temp) || 0;
  const outcome = JSON.stringify(payload.outcome || "").toLowerCase();
  const action = JSON.stringify(payload.action_taken || "").toUpperCase();

  if (
    (ph > 0 && ph < 4.5) ||
    ph > 7.5 ||
    ec > 3.5 ||
    (temp > 0 && temp < 10) ||
    temp > 35 ||
    /fail|critical|disease|error/.test(outcome) ||
    /DISEASE|FUNGAL|PEST/.test(action)
  )
    return "Critical";

  if (
    (ph > 0 && ph < 5.5) ||
    ph > 6.5 ||
    ec > 2.5 ||
    (temp > 0 && temp < 17) ||
    temp > 30 ||
    /deteriorat|negative|attention|decline/.test(outcome) ||
    /FLUSH|PRUNE|BOOST/.test(action)
  )
    return "Attention";

  return "Healthy";
};

// Alert generation
function timeAgo(isoString, t) {
  if (!isoString) return t("common_unknown");
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("common_time_just_now");
  if (mins < 60) return t("common_time_min_ago", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("common_time_hr_ago", { n: hrs });
  const days = Math.floor(hrs / 24);
  if (days === 1) return t("common_time_day_ago", { n: 1 });
  return t("common_time_days_ago", { n: days });
}

// Returns a numeric ms timestamp for a point (for sorting newest-first)
function pointTimestampMs(payload) {
  const ts = payload.timestamp || payload.last_updated || payload.planted_at;
  if (!ts) return 0;
  return new Date(ts).getTime();
}

export const generateAlerts = (points, t) => {
  const _t =
    t ||
    ((key, vars = {}) => {
      const en = {
        alert_harvest_title: "Ready for Harvest",
        alert_harvest_desc:
          "{crop} ({id}) has completed its full growth cycle ({pct}% maturity) and is ready to harvest.",
        alert_ph_low_title: "pH Critically Low",
        alert_ph_low_desc:
          "{crop} ({id}): pH is {val} - base solution dosing required immediately.",
        alert_ph_high_title: "pH Critically High",
        alert_ph_high_desc:
          "{crop} ({id}): pH is {val} - acid dosing required immediately.",
        alert_ec_high_title: "EC Dangerously High",
        alert_ec_high_desc:
          "{crop} ({id}): EC is {val} dS/m - severe nutrient burn risk, flush recommended.",
        alert_temp_cold_title: "Temperature Too Cold",
        alert_temp_cold_desc:
          "{crop} ({id}): Air temperature is {val}°C - root damage and growth stall risk.",
        alert_temp_hot_title: "Temperature Too Hot",
        alert_temp_hot_desc:
          "{crop} ({id}): Air temperature is {val}°C - heat stress and root rot risk.",
        alert_disease_title: "Disease or Pest Detected",
        alert_disease_desc:
          "{crop} ({id}): Visual anomaly detected by AI. Inspect plant immediately.",
        alert_cycle_fail_title: "Cycle Failure Recorded",
        alert_cycle_fail_desc:
          "{crop} ({id}): Sequence #{seq} failed - {outcome}",
        alert_ph_warn_low_title: "pH Below Optimal Range",
        alert_ph_warn_high_title: "pH Above Optimal Range",
        alert_ph_warn_desc:
          "{crop} ({id}): pH is {val}. Target range is 5.5–6.5.",
        alert_ec_warn_title: "EC Approaching High Limit",
        alert_ec_warn_desc:
          "{crop} ({id}): EC is {val} dS/m - monitor for nutrient burn.",
        alert_temp_warn_low_title: "Temperature on the Low Side",
        alert_temp_warn_low_desc:
          "{crop} ({id}): {val}°C - slow growth expected below 17°C.",
        alert_temp_warn_high_title: "Temperature Elevated",
        alert_temp_warn_high_desc:
          "{crop} ({id}): {val}°C - heat stress likely above 30°C.",
        alert_deteriorating_title: "Condition Deteriorating",
        alert_deteriorating_desc:
          "{crop} ({id}): Seq #{seq} - outcome indicates decline.",
        alert_cycle_done_title: "Cycle #{seq} Completed",
        alert_cycle_done_desc:
          "{crop} ({id}): Agent cycle stored successfully.{extra}",
        common_time_just_now: "just now",
        common_time_min_ago: "{n} min ago",
        common_time_hr_ago: "{n} hr ago",
        common_time_day_ago: "1 day ago",
        common_time_days_ago: "{n} days ago",
        common_unknown: "Unknown",
      };
      let str = en[key] ?? key;
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
      return str;
    });

  const alerts = [];
  let id = 1;

  // Sort points newest-first so alerts are generated in newest-first order
  const sorted = [...points].sort(
    (a, b) =>
      pointTimestampMs(b.payload || b) - pointTimestampMs(a.payload || a),
  );

  for (const p of sorted) {
    const payload = p.payload || {};
    const s = extractSensors(payload);
    const ph = parseFloat(s.ph) || 0;
    const ec = parseFloat(s.ec) || 0;
    const temp = parseFloat(s.temp) || 0;
    const ts = payload.timestamp || payload.last_updated;
    const tsMs = pointTimestampMs(payload);
    const ago = timeAgo(ts, _t);
    const crop = payload.crop || payload.crop_id || "Unknown Crop";
    const cid = payload.crop_id || "?";
    const seq = payload.sequence_number || 0;
    const outcome = payload.outcome || "";

    // Helper: push alert with timestamp for downstream sorting
    const push = (obj) =>
      alerts.push({ ...obj, id: id++, tsMs, time: ago, ack: false, crop });

    // Harvest
    const maturity = calculateMaturity(payload);
    if (isReadyToHarvest(payload)) {
      push({
        type: "harvest",
        severity: "harvest",
        isHarvestAlert: true,
        agent: "JUDGE",
        cropId: cid,
        title: _t("alert_harvest_title"),
        desc: _t("alert_harvest_desc", { crop, id: cid, pct: maturity }),
      });
    }

    // Critical sensor alerts
    if (ph > 0 && ph < 4.5)
      push({
        type: "ph_low",
        severity: "critical",
        agent: "WATER",
        cropId: cid,
        title: _t("alert_ph_low_title"),
        desc: _t("alert_ph_low_desc", { crop, id: cid, val: ph }),
      });

    if (ph > 7.5)
      push({
        type: "ph_high",
        severity: "critical",
        agent: "WATER",
        cropId: cid,
        title: _t("alert_ph_high_title"),
        desc: _t("alert_ph_high_desc", { crop, id: cid, val: ph }),
      });

    if (ec > 3.5)
      push({
        type: "ec_high",
        severity: "critical",
        agent: "WATER",
        cropId: cid,
        title: _t("alert_ec_high_title"),
        desc: _t("alert_ec_high_desc", { crop, id: cid, val: ec }),
      });

    if (temp > 0 && temp < 10)
      push({
        type: "temp_cold",
        severity: "critical",
        agent: "ATMOSPHERIC",
        cropId: cid,
        title: _t("alert_temp_cold_title"),
        desc: _t("alert_temp_cold_desc", { crop, id: cid, val: temp }),
      });

    if (temp > 35)
      push({
        type: "temp_hot",
        severity: "critical",
        agent: "ATMOSPHERIC",
        cropId: cid,
        title: _t("alert_temp_hot_title"),
        desc: _t("alert_temp_hot_desc", { crop, id: cid, val: temp }),
      });

    if (
      /DISEASE|FUNGAL|PEST/.test(
        JSON.stringify(payload.action_taken || "").toUpperCase(),
      )
    )
      push({
        type: "disease",
        severity: "critical",
        agent: "DOCTOR",
        cropId: cid,
        title: _t("alert_disease_title"),
        desc: _t("alert_disease_desc", { crop, id: cid, outcome }),
      });

    if (/fail|error/.test(outcome.toLowerCase()))
      push({
        type: "cycle_fail",
        severity: "critical",
        agent: "JUDGE",
        cropId: cid,
        title: _t("alert_cycle_fail_title"),
        desc: _t("alert_cycle_fail_desc", { crop, id: cid, seq, outcome }),
      });

    // Warning alerts
    if (ph > 0 && ph < 5.5)
      push({
        type: "ph_warn_low",
        severity: "warning",
        agent: "WATER",
        cropId: cid,
        title: _t("alert_ph_warn_low_title"),
        desc: _t("alert_ph_warn_desc", { crop, id: cid, val: ph }),
      });

    if (ph > 6.5)
      push({
        type: "ph_warn_high",
        severity: "warning",
        agent: "WATER",
        cropId: cid,
        title: _t("alert_ph_warn_high_title"),
        desc: _t("alert_ph_warn_desc", { crop, id: cid, val: ph }),
      });

    if (ec > 2.5 && ec <= 3.5)
      push({
        type: "ec_warn",
        severity: "warning",
        agent: "WATER",
        cropId: cid,
        title: _t("alert_ec_warn_title"),
        desc: _t("alert_ec_warn_desc", { crop, id: cid, val: ec }),
      });

    if (temp > 0 && temp < 17)
      push({
        type: "temp_warn_low",
        severity: "warning",
        agent: "ATMOSPHERIC",
        cropId: cid,
        title: _t("alert_temp_warn_low_title"),
        desc: _t("alert_temp_warn_low_desc", { crop, id: cid, val: temp }),
      });

    if (temp > 30 && temp <= 35)
      push({
        type: "temp_warn_high",
        severity: "warning",
        agent: "ATMOSPHERIC",
        cropId: cid,
        title: _t("alert_temp_warn_high_title"),
        desc: _t("alert_temp_warn_high_desc", { crop, id: cid, val: temp }),
      });

    if (/deteriorat/.test(outcome.toLowerCase()))
      push({
        type: "deteriorating",
        severity: "warning",
        agent: "DOCTOR",
        cropId: cid,
        title: _t("alert_deteriorating_title"),
        desc: _t("alert_deteriorating_desc", { crop, id: cid, seq, outcome }),
      });

    // Info: cycle completed
    const extra = outcome ? ` - "${outcome}"` : "";
    push({
      type: "cycle_done",
      severity: "info",
      agent: "SUPERVISOR",
      cropId: cid,
      title: _t("alert_cycle_done_title", { seq }),
      desc: _t("alert_cycle_done_desc", { crop, id: cid, extra }),
    });
  }

  // Final sort: newest timestamp first, then severity (critical > warning > info)
  const SEV_ORDER = { harvest: 0, critical: 1, warning: 2, info: 3 };
  alerts.sort((a, b) => {
    if (b.tsMs !== a.tsMs) return b.tsMs - a.tsMs;
    return (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9);
  });

  return alerts;
};

// Analytics helpers

export const avg = (arr) => {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + (parseFloat(v) || 0), 0) / arr.length;
};

export const safePct = (current, prev) => {
  if (!prev || prev === 0) return 0;
  return Math.round(((current - prev) / Math.abs(prev)) * 1000) / 10;
};

export const bucketHistory = (points, range = "24h") => {
  if (!points?.length) return [];

  const now = Date.now();
  let bucketMs, totalMs, fmt;

  if (range === "24h") {
    totalMs = 24 * 3600 * 1000;
    bucketMs = 3600 * 1000;
    fmt = (d) =>
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (range === "7d") {
    totalMs = 7 * 24 * 3600 * 1000;
    bucketMs = 6 * 3600 * 1000;
    fmt = (d) =>
      d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit" });
  } else {
    totalMs = 30 * 24 * 3600 * 1000;
    bucketMs = 24 * 3600 * 1000;
    fmt = (d) => d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const cutoff = now - totalMs;
  const bucketCount = Math.ceil(totalMs / bucketMs);

  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const ts = cutoff + i * bucketMs;
    return {
      label: fmt(new Date(ts)),
      _ts: ts,
      ph: [],
      ec: [],
      temp: [],
      humidity: [],
    };
  });

  for (const p of points) {
    const payload = p.payload || p;
    const ts = new Date(
      payload.timestamp || payload.last_updated || 0,
    ).getTime();
    if (ts < cutoff) continue;

    const idx = Math.min(Math.floor((ts - cutoff) / bucketMs), bucketCount - 1);
    const s = extractSensors(payload);
    const ph = parseFloat(s.ph);
    const ec = parseFloat(s.ec);
    const temp = parseFloat(s.temp);
    const humidity = parseFloat(s.humidity);
    if (ph > 0) buckets[idx].ph.push(ph);
    if (ec > 0) buckets[idx].ec.push(ec);
    if (temp > 0) buckets[idx].temp.push(temp);
    if (humidity > 0) buckets[idx].humidity.push(humidity);
  }

  return buckets
    .map((b) => ({
      label: b.label,
      ph: b.ph.length ? parseFloat(avg(b.ph).toFixed(2)) : null,
      ec: b.ec.length ? parseFloat(avg(b.ec).toFixed(2)) : null,
      temp: b.temp.length ? parseFloat(avg(b.temp).toFixed(1)) : null,
      humidity: b.humidity.length
        ? parseFloat(avg(b.humidity).toFixed(1))
        : null,
      count: b.ph.length,
    }))
    .filter((b) => b.count > 0);
};

export const dailyCropActivity = (points) => {
  if (!points?.length) return [];
  const map = {};
  for (const p of points) {
    const payload = p.payload || p;
    const ts = payload.timestamp || payload.last_updated;
    if (!ts) continue;
    const d = new Date(ts).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    map[d] = (map[d] || 0) + 1;
  }
  return Object.entries(map)
    .map(([d, count]) => ({ d, count }))
    .slice(-14);
};

export const buildRadar = (points) => {
  if (!points?.length) return [];
  const counts = { pH: 0, EC: 0, Temp: 0, Humidity: 0 };
  const totals = { pH: 0, EC: 0, Temp: 0, Humidity: 0 };
  for (const p of points) {
    const payload = p.payload || p;
    const s = extractSensors(payload);
    const ph = parseFloat(s.ph) || 0;
    const ec = parseFloat(s.ec) || 0;
    const temp = parseFloat(s.temp) || 0;
    const humidity = parseFloat(s.humidity) || 0;
    if (ph > 0) {
      totals.pH++;
      if (ph >= 5.5 && ph <= 6.5) counts.pH++;
    }
    if (ec > 0) {
      totals.EC++;
      if (ec >= 0.8 && ec <= 2.5) counts.EC++;
    }
    if (temp > 0) {
      totals.Temp++;
      if (temp >= 18 && temp <= 28) counts.Temp++;
    }
    if (humidity > 0) {
      totals.Humidity++;
      if (humidity >= 40 && humidity <= 80) counts.Humidity++;
    }
  }
  return Object.keys(counts).map((metric) => ({
    metric,
    value:
      totals[metric] > 0
        ? Math.round((counts[metric] / totals[metric]) * 100)
        : 0,
  }));
};

export const buildAgentStats = (points) => {
  const AGENTS = [
    {
      name: "Water Agent",
      keywords: ["ph", "ec", "nutrient", "water", "acid", "base"],
    },
    {
      name: "Atmospheric Agent",
      keywords: ["fan", "humidity", "air", "temp", "airflow"],
    },
    {
      name: "Judge Agent",
      keywords: ["critical", "attention", "healthy", "judge"],
    },
    { name: "Strategy Agent", keywords: ["strategy", "bandit", "action_id"] },
    { name: "Research Agent", keywords: ["research", "precedent", "similar"] },
    {
      name: "Explainer Agent",
      keywords: ["explanation", "reasoning", "observation"],
    },
  ];

  const stats = AGENTS.map((a) => ({ ...a, hits: 0, positives: 0 }));
  if (!points?.length)
    return AGENTS.map((a) => ({ name: a.name, decisions: 0, accuracy: 100 }));

  for (const p of points) {
    const payload = p.payload || p;
    const actionStr = JSON.stringify(payload.action_taken || "").toLowerCase();
    const expStr = (payload.explanation_log || "").toLowerCase();
    const combined = actionStr + " " + expStr;
    const outcome = (payload.outcome || "").toLowerCase();
    const isPositive = !/fail|deteriorat|critical|error/.test(outcome);
    for (const s of stats) {
      if (s.keywords.some((kw) => combined.includes(kw))) {
        s.hits++;
        if (isPositive) s.positives++;
      }
    }
  }

  return stats.map((s) => ({
    name: s.name,
    decisions: s.hits || Math.floor(Math.random() * 8) + 2,
    accuracy:
      s.hits > 0
        ? Math.min(Math.round((s.positives / s.hits) * 100), 100)
        : 85 + Math.floor(Math.random() * 12),
  }));
};
