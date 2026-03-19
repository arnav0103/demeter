import { useRef, useState } from "react";
import {
  Upload,
  Save,
  Activity,
  Droplets,
  Thermometer,
  Wind,
  Sprout,
  Calendar,
  Leaf,
  Database,
  Mic,
  Square,
  Zap,
  Fan,
  FlaskConical,
  Waves,
  Brain,
  ChevronDown,
  Eye,
} from "lucide-react";
import { agentService } from "../api/agentApi";
import { extractSensors, formatOutcome } from "../utils/dataUtils";
import Sidebar from "../components/Sidebar";

const INPUT_FIELDS = [
  {
    label: "pH Level",
    name: "pH",
    icon: Droplets,
    color: "var(--green)",
    type: "number",
  },
  {
    label: "EC (mS/cm)",
    name: "EC",
    icon: Activity,
    color: "var(--amber)",
    type: "number",
  },
  {
    label: "Temp (°C)",
    name: "temp",
    icon: Thermometer,
    color: "var(--blue)",
    type: "number",
  },
  {
    label: "Humidity (%)",
    name: "humidity",
    icon: Wind,
    color: "#a78bfa",
    type: "number",
  },
  {
    label: "Crop Type",
    name: "crop",
    icon: Sprout,
    color: "var(--green)",
    type: "select",
    opts: ["Lettuce", "Tomato", "Cucumber", "Basil", "Spinach"],
  },
  {
    label: "Stage",
    name: "stage",
    icon: Calendar,
    color: "var(--text-3)",
    type: "select",
    opts: ["Seedling", "Vegetative", "Flowering", "Fruiting"],
  },
  {
    label: "Crop ID (Opt)",
    name: "crop_id",
    icon: Database,
    color: "var(--text-3)",
    type: "text",
    placeholder: "e.g., Batch_A1",
  },
];

const ACTION_MAP = {
  acid_dosage_ml: {
    label: "Acid Dosage",
    icon: FlaskConical,
    unit: "ml",
    color: "var(--red)",
  },
  base_dosage_ml: {
    label: "Base Dosage",
    icon: FlaskConical,
    unit: "ml",
    color: "#a78bfa",
  },
  nutrient_dosage_ml: {
    label: "Nutrients",
    icon: Sprout,
    unit: "ml",
    color: "var(--green)",
  },
  fan_speed_pct: {
    label: "Fan Speed",
    icon: Fan,
    unit: "%",
    color: "var(--blue)",
  },
  water_refill_l: {
    label: "Water Refill",
    icon: Waves,
    unit: "L",
    color: "var(--blue)",
  },
};

export default function AgentControl() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [loadingIngest, setLoadingIngest] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [textQuery, setTextQuery] = useState("");

  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationText, setExplanationText] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [decision, setDecision] = useState(null);
  const [toast, setToast] = useState(null);

  const [sensors, setSensors] = useState({
    pH: "6.0",
    EC: "1.2",
    temp: "24.0",
    humidity: "60",
    crop: "Lettuce",
    stage: "Vegetative",
    crop_id: "",
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFile = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
      setDecision(null);
    }
  };

  const handleIngest = async () => {
    if (!file) return showToast("Select an image first", "error");
    setLoadingIngest(true);
    try {
      await agentService.uploadFMU(file, sensors);
      showToast("Memory stored successfully");
    } catch {
      showToast("Ingest failed", "error");
    } finally {
      setLoadingIngest(false);
    }
  };

  const handleSearch = async () => {
    if (!file) return showToast("Select an image to analyze", "error");
    setLoadingSearch(true);
    setDecision(null);
    try {
      const res = await agentService.searchFMU(file, sensors);
      if (res.explanation) setExplanationText(res.explanation);
      if (res.agent_decision) setDecision(res.agent_decision);
      setSearchResults(res.search_results || []);
    } catch {
      showToast("Analysis failed", "error");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleTextQuery = async () => {
    if (!textQuery) return;
    setLoadingSearch(true);
    try {
      const data = await agentService.queryText(textQuery);
      if (data.results)
        setSearchResults(
          data.results.map((r) => ({
            id: r.id,
            score: r.score || 1,
            payload: r.payload,
          })),
        );
    } catch {
      showToast("Query failed", "error");
    } finally {
      setLoadingSearch(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setLoadingSearch(true);
        try {
          const data = await agentService.queryAudio(blob);
          if (data.transcription) setTextQuery(data.transcription);
          if (data.results)
            setSearchResults(
              data.results.map((r) => ({
                id: r.id,
                score: r.score || 1,
                payload: r.payload,
              })),
            );
        } finally {
          setLoadingSearch(false);
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      showToast("Microphone access denied", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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

      {/* Toast */}
      {toast && (
        <div
          className="animate-fade-in"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 50,
            padding: "10px 16px",
            borderRadius: 12,
            fontSize: 12,
            fontFamily: "DM Mono, monospace",
            background:
              toast.type === "error"
                ? "rgba(248,113,113,0.15)"
                : "rgba(74,222,128,0.15)",
            border: `1px solid ${toast.type === "error" ? "rgba(248,113,113,0.4)" : "rgba(74,222,128,0.4)"}`,
            color: toast.type === "error" ? "var(--red)" : "var(--green)",
          }}
        >
          {toast.msg}
        </div>
      )}

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
            gap: 12,
          }}
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
            }}
          >
            <Brain size={15} style={{ color: "var(--green)" }} />
          </div>
          <div>
            <h1
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text)",
                margin: 0,
              }}
            >
              Agent Control
            </h1>
            <p
              style={{
                fontSize: 11,
                fontFamily: "DM Mono, monospace",
                color: "var(--text-3)",
                margin: 0,
              }}
            >
              Ingest memories · Query the Supervisor · Run analysis
            </p>
          </div>
        </header>

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
          {/* Search bar */}
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: 8,
              borderRadius: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <button
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                flexShrink: 0,
                cursor: "pointer",
                background: isRecording
                  ? "rgba(248,113,113,0.15)"
                  : "var(--bg-3)",
                border: `1px solid ${isRecording ? "rgba(248,113,113,0.4)" : "var(--border)"}`,
                color: isRecording ? "var(--red)" : "var(--text-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isRecording ? <Square size={13} /> : <Mic size={13} />}
            </button>
            <input
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextQuery()}
              placeholder="Ask Demeter: 'Show all failed Lettuce crops'…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 13,
                fontFamily: "DM Mono, monospace",
                color: "var(--text)",
                caretColor: "var(--green)",
              }}
            />
            <button
              onClick={handleTextQuery}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                background: "var(--green)",
                color: "#0c1a0e",
                border: "none",
                cursor: "pointer",
              }}
            >
              Ask
            </button>
          </div>

          {/* Main grid */}
          <div
            style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 20 }}
          >
            {/* Image upload */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label
                style={{
                  position: "relative",
                  display: "block",
                  borderRadius: 16,
                  overflow: "hidden",
                  cursor: "pointer",
                  height: 300,
                  background: "var(--surface)",
                  border: "2px dashed var(--border)",
                }}
              >
                <input
                  type="file"
                  onChange={handleFile}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                    zIndex: 10,
                  }}
                />
                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt="preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to top, rgba(12,26,14,0.6) 0%, transparent 60%)",
                      }}
                    />
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      gap: 12,
                      padding: 24,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        background: "var(--bg-3)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Upload size={20} style={{ color: "var(--text-3)" }} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--text-2)",
                        }}
                      >
                        Drop crop image
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 4,
                          color: "var(--text-3)",
                        }}
                      >
                        PNG, JPG up to 10MB
                      </div>
                    </div>
                  </div>
                )}
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <button
                  onClick={handleIngest}
                  disabled={loadingIngest || loadingSearch}
                  style={{
                    padding: "10px 0",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    cursor: "pointer",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-2)",
                    opacity: loadingIngest || loadingSearch ? 0.6 : 1,
                  }}
                >
                  {loadingIngest ? (
                    <Activity size={13} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={13} /> Store
                    </>
                  )}
                </button>
                <button
                  onClick={handleSearch}
                  disabled={loadingIngest || loadingSearch}
                  style={{
                    padding: "10px 0",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    cursor: "pointer",
                    background: "var(--green)",
                    border: "none",
                    color: "#0c1a0e",
                    opacity: loadingIngest || loadingSearch ? 0.6 : 1,
                  }}
                >
                  {loadingSearch ? (
                    <Activity size={13} className="animate-spin" />
                  ) : (
                    <>
                      <Brain size={13} /> Analyze
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sensor inputs */}
            <div
              style={{
                borderRadius: 16,
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
                // SENSOR PARAMETERS
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                {INPUT_FIELDS.map(
                  ({
                    label,
                    name,
                    icon: Icon,
                    color,
                    type,
                    opts,
                    placeholder,
                  }) => (
                    <div key={name}>
                      <label
                        style={{
                          fontSize: 10,
                          fontFamily: "DM Mono, monospace",
                          display: "block",
                          marginBottom: 5,
                          color,
                        }}
                      >
                        {label.toUpperCase()}
                      </label>
                      <div style={{ position: "relative" }}>
                        <Icon
                          size={12}
                          style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color,
                            zIndex: 1,
                          }}
                        />
                        {type === "select" ? (
                          <>
                            <select
                              value={sensors[name]}
                              onChange={(e) =>
                                setSensors({
                                  ...sensors,
                                  [name]: e.target.value,
                                })
                              }
                              style={{
                                width: "100%",
                                appearance: "none",
                                paddingLeft: 30,
                                paddingRight: 28,
                                paddingTop: 8,
                                paddingBottom: 8,
                                borderRadius: 8,
                                fontSize: 12,
                                fontFamily: "DM Mono, monospace",
                                background: "var(--bg-3)",
                                border: "1px solid var(--border)",
                                color: "var(--text)",
                                outline: "none",
                                cursor: "pointer",
                              }}
                            >
                              {opts.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={10}
                              style={{
                                position: "absolute",
                                right: 10,
                                top: "50%",
                                transform: "translateY(-50%)",
                                pointerEvents: "none",
                                color: "var(--text-3)",
                              }}
                            />
                          </>
                        ) : (
                          <input
                            value={sensors[name]}
                            onChange={(e) =>
                              setSensors({ ...sensors, [name]: e.target.value })
                            }
                            type={type}
                            placeholder={placeholder || ""}
                            step={type === "number" ? "0.1" : undefined}
                            style={{
                              width: "100%",
                              paddingLeft: 30,
                              paddingRight: 10,
                              paddingTop: 8,
                              paddingBottom: 8,
                              borderRadius: 8,
                              fontSize: 12,
                              fontFamily: "DM Mono, monospace",
                              background: "var(--bg-3)",
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* Decision output */}
          {decision && (
            <div
              className="animate-fade-up"
              style={{
                borderRadius: 16,
                overflow: "hidden",
                background: "var(--surface)",
                border: "1px solid rgba(74,222,128,0.3)",
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(74,222,128,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Brain size={15} style={{ color: "var(--green)" }} />
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--text)",
                    }}
                  >
                    Supervisor Command
                  </span>
                </div>
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontFamily: "DM Mono, monospace",
                    padding: "5px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-3)",
                  }}
                >
                  <Eye size={11} /> {showExplanation ? "Hide" : "View"} logic
                </button>
              </div>

              <div
                style={{
                  padding: 20,
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 12,
                }}
              >
                {Object.entries(decision).map(([key, value]) => {
                  const meta = ACTION_MAP[key] || {
                    label: key,
                    icon: Zap,
                    unit: "",
                    color: "var(--text-3)",
                  };
                  const Icon = meta.icon;
                  return (
                    <div
                      key={key}
                      style={{
                        borderRadius: 12,
                        padding: 14,
                        textAlign: "center",
                        background: "var(--bg-3)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: `${meta.color}15`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 8px",
                        }}
                      >
                        <Icon size={13} style={{ color: meta.color }} />
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontFamily: "DM Mono, monospace",
                          fontSize: 20,
                          color: meta.color,
                        }}
                      >
                        {value}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          fontFamily: "DM Mono, monospace",
                          marginTop: 2,
                          color: "var(--text-3)",
                        }}
                      >
                        {meta.unit}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          marginTop: 4,
                          color: "var(--text-3)",
                        }}
                      >
                        {meta.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {showExplanation && explanationText && (
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    padding: 20,
                    background: "var(--bg-3)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "DM Mono, monospace",
                      color: "var(--text-3)",
                      marginBottom: 8,
                    }}
                  >
                    // SUPERVISOR REASONING
                  </div>
                  <pre
                    style={{
                      fontSize: 11,
                      fontFamily: "DM Mono, monospace",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      color: "var(--text-2)",
                      margin: 0,
                    }}
                  >
                    {explanationText}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <Database size={13} style={{ color: "var(--text-3)" }} />
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "DM Mono, monospace",
                    color: "var(--text-3)",
                  }}
                >
                  MEMORY MATCHES · {searchResults.length} FOUND
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 14,
                }}
              >
                {searchResults.map((res) => {
                  const s = extractSensors(res.payload);
                  return (
                    <div
                      key={res.id}
                      className="card-hover"
                      style={{
                        borderRadius: 12,
                        padding: 14,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Leaf size={13} style={{ color: "var(--green)" }} />
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              color: "var(--text)",
                            }}
                          >
                            {res.payload.crop || "Unknown"}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: "DM Mono, monospace",
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(74,222,128,0.1)",
                            color: "var(--green)",
                          }}
                        >
                          {((res.score || 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                        }}
                      >
                        {[
                          { label: "pH", value: s.ph, color: "var(--green)" },
                          { label: "EC", value: s.ec, color: "var(--amber)" },
                        ].map(({ label, value, color }) => (
                          <div
                            key={label}
                            style={{
                              borderRadius: 8,
                              padding: "6px 10px",
                              textAlign: "center",
                              background: "var(--bg-3)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 9,
                                fontFamily: "DM Mono, monospace",
                                color: "var(--text-3)",
                              }}
                            >
                              {label}
                            </div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontFamily: "DM Mono, monospace",
                                fontSize: 14,
                                color,
                              }}
                            >
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                      {res.payload.outcome && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 11,
                            color: "var(--text-3)",
                          }}
                        >
                          {formatOutcome(res.payload.outcome)?.substring(0, 80)}
                          …
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
