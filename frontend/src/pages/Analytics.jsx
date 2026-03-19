import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import { useFarmData } from "../hooks/useFarmData";
import {
  extractSensors,
  avg,
  safePct,
  bucketHistory,
  dailyCropActivity,
  buildRadar,
  buildAgentStats,
} from "../utils/dataUtils";
import { TrendingUp, TrendingDown, Minus, Download } from "lucide-react";
import Sidebar from "../components/Sidebar";

// Shared Tooltip
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

// Metric Card
function MetricCard({ label, value, unit, change, color, loading }) {
  const up = change > 0;
  const flat = change === 0;
  return (
    <div
      className="card-hover"
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
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      {loading ? (
        <div
          className="shimmer"
          style={{ height: 32, width: 96, borderRadius: 6 }}
        />
      ) : (
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            fontFamily: "DM Mono, monospace",
            color: color || "var(--text)",
          }}
        >
          {value}
          <span
            style={{
              fontSize: 14,
              fontWeight: 400,
              marginLeft: 4,
              color: "var(--text-3)",
            }}
          >
            {unit}
          </span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: 8,
          fontSize: 11,
          fontFamily: "DM Mono, monospace",
        }}
      >
        {flat ? (
          <Minus size={11} style={{ color: "var(--text-3)" }} />
        ) : up ? (
          <TrendingUp size={11} style={{ color: "var(--green)" }} />
        ) : (
          <TrendingDown size={11} style={{ color: "var(--red)" }} />
        )}
        <span
          style={{
            color: flat ? "var(--text-3)" : up ? "var(--green)" : "var(--red)",
          }}
        >
          {Math.abs(change)}% vs prior period
        </span>
      </div>
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 10,
          fontFamily: "DM Mono, monospace",
          color: "var(--text-3)",
        }}
      >
        // {sub}
      </div>
      <h2
        style={{
          fontWeight: 700,
          fontSize: 15,
          color: "var(--text)",
          margin: "4px 0 0",
        }}
      >
        {children}
      </h2>
    </div>
  );
}

function EmptyChart({ height = 180, message = "No data yet" }) {
  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        background: "var(--bg-3)",
        border: "1px dashed var(--border)",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontFamily: "DM Mono, monospace",
          color: "var(--text-3)",
        }}
      >
        {message}
      </span>
    </div>
  );
}

// MAIN

export default function Analytics() {
  const [range, setRange] = useState("24h");
  const { dashboard, history: allPoints, loading } = useFarmData();

  const buckets = useMemo(
    () => bucketHistory(allPoints, range),
    [allPoints, range],
  );

  // Latest fleet-wide averages
  const latestSensors = useMemo(() => {
    if (!dashboard.length) return { ph: 0, ec: 0, temp: 0 };
    const sensors = dashboard.map((d) => extractSensors(d.payload));
    return {
      ph: parseFloat(avg(sensors.map((s) => parseFloat(s.ph) || 0)).toFixed(2)),
      ec: parseFloat(avg(sensors.map((s) => parseFloat(s.ec) || 0)).toFixed(2)),
      temp: parseFloat(
        avg(sensors.map((s) => parseFloat(s.temp) || 0)).toFixed(1),
      ),
    };
  }, [dashboard]);

  // First-half vs second-half for % change
  const prevSensors = useMemo(() => {
    if (allPoints.length < 2) return latestSensors;
    const older = allPoints
      .slice(0, Math.floor(allPoints.length / 2))
      .map((p) => extractSensors(p.payload));
    return {
      ph: parseFloat(avg(older.map((s) => parseFloat(s.ph) || 0)).toFixed(2)),
      ec: parseFloat(avg(older.map((s) => parseFloat(s.ec) || 0)).toFixed(2)),
      temp: parseFloat(
        avg(older.map((s) => parseFloat(s.temp) || 0)).toFixed(1),
      ),
    };
  }, [allPoints, latestSensors]);

  const activityData = useMemo(() => dailyCropActivity(allPoints), [allPoints]);
  const radarData = useMemo(() => buildRadar(allPoints), [allPoints]);
  const agentStats = useMemo(() => buildAgentStats(allPoints), [allPoints]);

  // CSV export
  const handleExport = () => {
    if (!buckets.length) return;
    const header = "time,ph,ec,temp,humidity,entries";
    const rows = buckets.map(
      (b) => `${b.label},${b.ph},${b.ec},${b.temp},${b.humidity},${b.count}`,
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `demeter-analytics-${range}.csv`;
    a.click();
  };

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
          <div>
            <h1
              style={{
                fontWeight: 700,
                fontSize: 18,
                color: "var(--text)",
                margin: 0,
              }}
            >
              Analytics
            </h1>
            <p
              style={{
                fontSize: 11,
                fontFamily: "DM Mono, monospace",
                color: "var(--text-3)",
                margin: 0,
              }}
            >
              {loading
                ? "Loading…"
                : `${allPoints.length} data points across ${dashboard.length} crops`}
            </p>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {["24h", "7d", "30d"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: "DM Mono, monospace",
                  cursor: "pointer",
                  background:
                    range === r ? "rgba(74,222,128,0.12)" : "var(--surface)",
                  border: `1px solid ${range === r ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
                  color: range === r ? "var(--green)" : "var(--text-3)",
                  transition: "all 0.15s",
                }}
              >
                {r}
              </button>
            ))}
            <button
              onClick={handleExport}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 8,
                fontSize: 11,
                fontFamily: "DM Mono, monospace",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-3)",
                cursor: "pointer",
              }}
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {/* Metric cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            <MetricCard
              loading={loading}
              label="AVG pH"
              value={latestSensors.ph}
              unit=""
              change={safePct(latestSensors.ph, prevSensors.ph)}
              color="var(--green)"
            />
            <MetricCard
              loading={loading}
              label="AVG EC"
              value={latestSensors.ec}
              unit="dS/m"
              change={safePct(latestSensors.ec, prevSensors.ec)}
              color="var(--amber)"
            />
            <MetricCard
              loading={loading}
              label="AVG TEMP"
              value={latestSensors.temp}
              unit="°C"
              change={safePct(latestSensors.temp, prevSensors.temp)}
              color="var(--blue)"
            />
            <MetricCard
              loading={loading}
              label="TOTAL SEQUENCES"
              value={allPoints.length}
              unit=""
              change={safePct(
                allPoints.length,
                Math.max(allPoints.length - dashboard.length, 1),
              )}
              color="var(--text)"
            />
          </div>

          {/* pH + EC */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {[
              {
                title: "pH Over Time",
                key: "ph",
                stroke: "var(--green)",
                gradId: "phGradA",
                gradColor: "#4ade80",
              },
              {
                title: "EC Concentration",
                key: "ec",
                stroke: "var(--amber)",
                gradId: "ecGradA",
                gradColor: "#f59e0b",
              },
            ].map(({ title, key, stroke, gradId, gradColor }) => (
              <div
                key={key}
                style={{
                  borderRadius: 12,
                  padding: 20,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <SectionTitle sub={`${range.toUpperCase()} TRACE`}>
                  {title}
                </SectionTitle>
                {buckets.length < 2 ? (
                  <EmptyChart message="Not enough data for this range" />
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={buckets}>
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor={gradColor}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor={gradColor}
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
                        dataKey="label"
                        tick={{
                          fontSize: 9,
                          fill: "var(--text-3)",
                          fontFamily: "DM Mono",
                        }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
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
                        dataKey={key}
                        stroke={stroke}
                        fill={`url(#${gradId})`}
                        strokeWidth={2}
                        dot={false}
                        name={key.toUpperCase()}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            ))}
          </div>

          {/* Temp + Humidity */}
          <div
            style={{
              borderRadius: 12,
              padding: 20,
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <SectionTitle sub={`${range.toUpperCase()} TRACE`}>
              Temperature & Humidity
            </SectionTitle>
            {buckets.length < 2 ? (
              <EmptyChart message="Not enough data for this range" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={buckets}>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 9,
                      fill: "var(--text-3)",
                      fontFamily: "DM Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="left"
                    domain={["auto", "auto"]}
                    tick={{
                      fontSize: 9,
                      fill: "var(--text-3)",
                      fontFamily: "DM Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
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
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="temp"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dot={false}
                    name="Temp °C"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="humidity"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                    name="Humidity %"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Activity + Radar */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div
              style={{
                borderRadius: 12,
                padding: 20,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <SectionTitle sub="DAILY ACTIVITY">
                Sequences Logged per Day
              </SectionTitle>
              {activityData.length < 2 ? (
                <EmptyChart height={180} message="Need 2+ days of data" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={activityData} barGap={4}>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="d"
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
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      fill="#2d7a44"
                      radius={[4, 4, 0, 0]}
                      name="Sequences"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div
              style={{
                borderRadius: 12,
                padding: 20,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <SectionTitle sub="PARAMETER HEALTH">
                In-Range Score (%)
              </SectionTitle>
              {radarData.length < 2 ? (
                <EmptyChart height={180} message="Not enough data points" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart
                    data={radarData}
                    cx="50%"
                    cy="50%"
                    outerRadius="65%"
                  >
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="var(--green)"
                      fill="rgba(74,222,128,0.15)"
                      strokeWidth={2}
                      name="In-range %"
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Crop summary table */}
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{ padding: 20, borderBottom: "1px solid var(--border)" }}
            >
              <SectionTitle sub="PER CROP">Latest Sensor Summary</SectionTitle>
            </div>
            {loading ? (
              <div
                style={{
                  padding: 32,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "DM Mono, monospace",
                    color: "var(--text-3)",
                  }}
                >
                  Loading…
                </span>
              </div>
            ) : dashboard.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  fontSize: 11,
                  fontFamily: "DM Mono, monospace",
                  color: "var(--text-3)",
                }}
              >
                No crops in database
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {[
                      "Crop ID",
                      "Type",
                      "Stage",
                      "pH",
                      "EC",
                      "Temp",
                      "Sequences",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 20px",
                          textAlign: "left",
                          fontSize: 10,
                          fontFamily: "DM Mono, monospace",
                          color: "var(--text-3)",
                          fontWeight: 400,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.map((item, i) => {
                    const p = item.payload || {};
                    const s = extractSensors(p);
                    return (
                      <tr
                        key={i}
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td
                          style={{
                            padding: "10px 20px",
                            fontFamily: "DM Mono, monospace",
                            fontSize: 11,
                            color: "var(--text)",
                          }}
                        >
                          {p.crop_id || "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 20px",
                            fontFamily: "DM Mono, monospace",
                            fontSize: 11,
                            color: "var(--text-2)",
                          }}
                        >
                          {p.crop || "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 20px",
                            fontFamily: "DM Mono, monospace",
                            fontSize: 11,
                            color: "var(--text-2)",
                          }}
                        >
                          {p.stage || "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 20px",
                            fontFamily: "DM Mono, monospace",
                            fontSize: 11,
                            color: "var(--green)",
                          }}
                        >
                          {s.ph}
                        </td>
                        <td
                          style={{
                            padding: "10px 20px",
                            fontFamily: "DM Mono, monospace",
                            fontSize: 11,
                            color: "var(--amber)",
                          }}
                        >
                          {s.ec}
                        </td>
                        <td
                          style={{
                            padding: "10px 20px",
                            fontFamily: "DM Mono, monospace",
                            fontSize: 11,
                            color: "var(--blue)",
                          }}
                        >
                          {s.temp}°C
                        </td>
                        <td
                          style={{
                            padding: "10px 20px",
                            fontFamily: "DM Mono, monospace",
                            fontSize: 11,
                            color: "var(--text-2)",
                          }}
                        >
                          {p.sequence_number || 1}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Agent activity */}
          {agentStats.length > 0 && (
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{ padding: 20, borderBottom: "1px solid var(--border)" }}
              >
                <SectionTitle sub="DERIVED FROM STORED ACTIONS">
                  Agent Activity
                </SectionTitle>
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {[
                      "Agent",
                      "Appearances in Log",
                      "Success Rate",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 20px",
                          textAlign: "left",
                          fontSize: 10,
                          fontFamily: "DM Mono, monospace",
                          color: "var(--text-3)",
                          fontWeight: 400,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agentStats.map(({ name, decisions, accuracy }) => (
                    <tr
                      key={name}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td
                        style={{
                          padding: "10px 20px",
                          fontFamily: "DM Mono, monospace",
                          fontSize: 11,
                          color: "var(--text)",
                        }}
                      >
                        {name}
                      </td>
                      <td
                        style={{
                          padding: "10px 20px",
                          fontFamily: "DM Mono, monospace",
                          fontSize: 11,
                          color: "var(--text-2)",
                        }}
                      >
                        {decisions}
                      </td>
                      <td style={{ padding: "10px 20px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              height: 6,
                              width: 96,
                              borderRadius: 3,
                              background: "var(--border)",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 3,
                                width: `${accuracy}%`,
                                background:
                                  accuracy > 80
                                    ? "var(--green)"
                                    : accuracy > 50
                                      ? "var(--amber)"
                                      : "var(--red)",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 11,
                              color: "var(--text-2)",
                            }}
                          >
                            {accuracy}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 20px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: "DM Mono, monospace",
                            padding: "3px 8px",
                            borderRadius: 20,
                            background: "rgba(74,222,128,0.1)",
                            color: "var(--green)",
                            border: "1px solid rgba(74,222,128,0.2)",
                          }}
                        >
                          ONLINE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
