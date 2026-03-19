export const formatNumber = (val) => {
  if (val === undefined || val === null || isNaN(parseFloat(val))) return "0";
  return Math.round(parseFloat(val) * 100) / 100;
};

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

export const extractSensors = (payload) => {
  if (!payload) return { temp: 0, ph: 0, humidity: 0, ec: 0 };
  let raw = payload.sensors || payload.sensor_data;
  if (!raw) {
    const action = parsePythonString(payload.action_taken);
    if (action) {
      raw = {
        temp: action.atmospheric_actions?.air_temp ?? action.air_temp ?? 0,
        ph: action.water_actions?.ph ?? action.ph ?? 0,
        humidity: action.atmospheric_actions?.humidity ?? action.humidity ?? 0,
        ec: action.water_actions?.ec ?? action.ec ?? 0,
      };
    } else {
      raw = {};
    }
  }
  return {
    temp: formatNumber(raw.temp ?? raw.Temp ?? 0),
    ph: formatNumber(raw.ph ?? raw.pH ?? 7.0),
    humidity: formatNumber(raw.humidity ?? raw.Humidity ?? 0),
    ec: formatNumber(raw.ec ?? raw.EC ?? 0),
  };
};

export const calculateMaturity = (seq) => {
  return Math.min((seq || 1) * 10, 100);
};

export const formatOutcome = (outcome) => {
  if (!outcome || typeof outcome !== "string") return "Monitoring...";

  // Strip reward suffix
  const cleanOutcome = outcome.split("| Reward:")[0].trim();

  const parts = cleanOutcome.split("|").map((p) => p.trim());
  let tags = [],
    notes = "";
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
  return t && notes ? `${t} — ${notes}` : t || notes;
};

// Crop health status
export const deriveCropStatus = (payload) => {
  if (!payload) return "Healthy";
  const s = extractSensors(payload);
  const ph = parseFloat(s.ph) || 0;
  const ec = parseFloat(s.ec) || 0;
  const temp = parseFloat(s.temp) || 0;
  const outcome = (payload.outcome || "").toLowerCase();
  const action = (payload.action_taken || "").toUpperCase();

  // Critical Thresholds
  if (
    (ph > 0 && ph < 4.5) ||
    ph > 7.5 ||
    ec > 3.5 ||
    (temp > 0 && temp < 10) ||
    temp > 35 ||
    /fail|critical|disease|error/.test(outcome) ||
    /DISEASE|FUNGAL|PEST/.test(action)
  ) {
    return "Critical";
  }

  // Warning/Attention Thresholds
  if (
    (ph > 0 && ph < 5.5) ||
    ph > 6.5 ||
    ec > 2.5 ||
    (temp > 0 && temp < 17) ||
    temp > 30 ||
    /deteriorat|negative|attention|decline/.test(outcome) ||
    /FLUSH|PRUNE|BOOST/.test(action)
  ) {
    return "Attention";
  }

  return "Healthy";
};
