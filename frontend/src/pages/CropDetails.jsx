import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCropDetails } from "../api/farmApi";
import {
  ArrowLeft,
  Thermometer,
  Droplet,
  Wind,
  Zap,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  extractSensors,
  parsePythonString,
  formatNumber,
  formatOutcome,
} from "../utils/dataUtils";
import Sidebar from "../components/Sidebar";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 11,
        fontFamily: "DM Mono, monospace",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
    >
      <div style={{ color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

function StatBox({ icon: Icon, label, value, color, unit }) {
  return (
    <div
      className="card-hover"
      style={{
        borderRadius: 12,
        padding: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `${color}15`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={13} style={{ color }} />
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: "DM Mono, monospace",
            textTransform: "uppercase",
            color: "var(--text-3)",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "DM Mono, monospace",
          color,
        }}
      >
        {value}
        <span
          style={{
            fontSize: 13,
            fontWeight: 400,
            marginLeft: 2,
            color: "var(--text-3)",
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

// Severity dot for logs
function logDotColor(payload) {
  const outcome = (payload?.outcome || "").toLowerCase();
  if (/fail|critical|disease|error/.test(outcome)) return "var(--red)";
  if (/deteriorat|negative|attention/.test(outcome)) return "var(--amber)";
  return "var(--green)";
}

const TABS = ["overview", "sensors", "log"];

export default function CropDetails() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchCropDetails(cropId).then((data) => {
      if (data?.length) {
        const sorted = [...data].sort(
          (a, b) =>
            (a.payload?.sequence_number || 0) -
            (b.payload?.sequence_number || 0),
        );
        const processed = sorted.map((item) => ({
          ...item,
          cleanSensors: extractSensors(item.payload || {}),
          parsedAction: parsePythonString((item.payload || {}).action_taken),
        }));
        setHistory(processed);
        setLatest(processed[processed.length - 1]);
      }
      setLoading(false);
    });
  }, [cropId]);

  if (loading)
    return (
      <div
        style={{ display: "flex", height: "100vh", background: "var(--bg)" }}
      >
        <Sidebar />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontFamily: "DM Mono, monospace",
              color: "var(--text-3)",
            }}
          >
            Loading crop data…
          </span>
        </div>
      </div>
    );

  if (!latest)
    return (
      <div
        style={{ display: "flex", height: "100vh", background: "var(--bg)" }}
      >
        <Sidebar />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "var(--text-3)" }}>Crop not found</span>
        </div>
      </div>
    );

  const p = latest.payload || {};
  const sensors = latest.cleanSensors || {};

  const chartData = history.map((h) => ({
    t: h.payload?.timestamp
      ? new Date(h.payload.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--",
    temp: formatNumber(h.cleanSensors?.temp),
    ph: formatNumber(h.cleanSensors?.ph),
    ec: formatNumber(h.cleanSensors?.ec),
    humidity: formatNumber(h.cleanSensors?.humidity),
  }));

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <header
          style={{
            flexShrink: 0,
            padding: "0 24px",
            height: 64,
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-2)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={15} />
          </button>

          <div>
            <h1
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text)",
                margin: 0,
              }}
            >
              {p.crop || "Unknown"}{" "}
              <span style={{ color: "var(--text-3)", fontWeight: 400 }}>
                #{p.sequence_number || 0}
              </span>
            </h1>
            <p
              style={{
                fontSize: 11,
                fontFamily: "DM Mono, monospace",
                color: "var(--text-3)",
                margin: 0,
              }}
            >
              {cropId} · {p.stage}
            </p>
          </div>

          {/* Live badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 20,
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.25)",
              fontSize: 11,
              fontFamily: "DM Mono, monospace",
              color: "var(--green)",
            }}
          >
            <span
              className="status-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--green)",
              }}
            />
            LIVE
          </div>

          {/* Tabs */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: "DM Mono, monospace",
                  textTransform: "capitalize",
                  cursor: "pointer",
                  background:
                    activeTab === tab ? "var(--surface-2)" : "transparent",
                  color: activeTab === tab ? "var(--text)" : "var(--text-3)",
                  border: `1px solid ${activeTab === tab ? "var(--border-bright)" : "transparent"}`,
                  transition: "all 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                }}
              >
                <StatBox
                  icon={Thermometer}
                  label="Temperature"
                  value={formatNumber(sensors.temp)}
                  unit="°C"
                  color="var(--blue)"
                />
                <StatBox
                  icon={Droplet}
                  label="pH Level"
                  value={formatNumber(sensors.ph)}
                  unit=""
                  color="var(--green)"
                />
                <StatBox
                  icon={Activity}
                  label="EC"
                  value={formatNumber(sensors.ec)}
                  unit="dS/m"
                  color="var(--amber)"
                />
                <StatBox
                  icon={Wind}
                  label="Humidity"
                  value={formatNumber(sensors.humidity)}
                  unit="%"
                  color="#a78bfa"
                />
              </div>

              {/* pH chart */}
              <div
                style={{
                  borderRadius: 12,
                  padding: 20,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "DM Mono, monospace",
                    color: "var(--text-3)",
                    marginBottom: 16,
                  }}
                >
                  // HISTORICAL pH TRACE
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="phGradCD" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#4ade80"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#4ade80"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="t"
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="ph"
                      stroke="var(--green)"
                      fill="url(#phGradCD)"
                      strokeWidth={2}
                      dot={false}
                      name="pH"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* AI analysis */}
              <div
                style={{
                  borderRadius: 12,
                  padding: 20,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "DM Mono, monospace",
                    color: "var(--text-3)",
                    marginBottom: 12,
                  }}
                >
                  // LATEST AI ANALYSIS
                </div>
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(74,222,128,0.1)",
                      border: "1px solid rgba(74,222,128,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Zap size={14} style={{ color: "var(--green)" }} />
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "var(--text-2)",
                    }}
                  >
                    {formatOutcome(p.outcome) ||
                      "System monitoring active. No anomalies detected."}
                  </div>
                </div>
                {p.action_taken && p.action_taken !== "PENDING_ACTION" && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 10,
                      borderRadius: 8,
                      fontFamily: "DM Mono, monospace",
                      fontSize: 11,
                      background: "var(--bg-3)",
                      border: "1px solid var(--border)",
                      color: "var(--text-3)",
                    }}
                  >
                    <span style={{ color: "var(--green)" }}>ACTION: </span>
                    {p.action_taken?.substring(0, 200)}…
                  </div>
                )}
              </div>
            </>
          )}

          {/* SENSORS */}
          {activeTab === "sensors" && (
            <>
              <div
                style={{
                  borderRadius: 12,
                  padding: 20,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "DM Mono, monospace",
                    color: "var(--text-3)",
                    marginBottom: 16,
                  }}
                >
                  // TEMP & HUMIDITY
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="t"
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={false}
                      name="Temp °C"
                    />
                    <Line
                      type="monotone"
                      dataKey="humidity"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={false}
                      name="Humidity %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  padding: 20,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "DM Mono, monospace",
                    color: "var(--text-3)",
                    marginBottom: 16,
                  }}
                >
                  // EC CONCENTRATION
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="ecGradCD" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f59e0b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="t"
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="ec"
                      stroke="var(--amber)"
                      fill="url(#ecGradCD)"
                      strokeWidth={2}
                      dot={false}
                      name="EC dS/m"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* LOG */}
          {activeTab === "log" && (
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Header row */}
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "DM Mono, monospace",
                    color: "var(--text-3)",
                  }}
                >
                  // EVENT LOG — {history.length} ENTRIES
                </div>
              </div>

              {/* Log rows */}
              <div>
                {[...history]
                  .reverse()
                  .slice(0, 20)
                  .map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 20px",
                        background:
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.015)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(74,222,128,0.04)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.015)")
                      }
                    >
                      {/* Severity dot */}
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: logDotColor(h.payload),
                          flexShrink: 0,
                        }}
                      />

                      {/* Timestamp */}
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "DM Mono, monospace",
                          color: "var(--text-3)",
                          flexShrink: 0,
                          width: 50,
                        }}
                      >
                        {h.payload?.timestamp
                          ? new Date(h.payload.timestamp).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "--"}
                      </span>

                      {/* Seq # */}
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "DM Mono, monospace",
                          color: "var(--text-3)",
                          width: 34,
                          flexShrink: 0,
                        }}
                      >
                        #{h.payload?.sequence_number || i}
                      </span>

                      {/* Sensor snapshot */}
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "DM Mono, monospace",
                          color: "var(--text-2)",
                          flexShrink: 0,
                        }}
                      >
                        pH {formatNumber(h.cleanSensors?.ph)} ·{" "}
                        {formatNumber(h.cleanSensors?.temp)}°C · EC{" "}
                        {formatNumber(h.cleanSensors?.ec)}
                      </span>

                      {/* Outcome / action */}
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-3)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatOutcome(h.payload?.outcome) ||
                          h.payload?.action_taken ||
                          "Routine check"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
