import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  X,
  Bell,
  BellOff,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  Scissors,
  RotateCcw,
  Leaf,
} from "lucide-react";
import { useFarmData } from "../hooks/useFarmData";
import { generateAlerts } from "../utils/dataUtils";
import {
  PageShell,
  PageHeader,
  IconButton,
  FilterPill,
  LoadingShimmer,
  EmptyState,
} from "../components/ui";
import { useT } from "../hooks/useTranslation";

// Severity
const SEV = {
  critical: {
    icon: AlertTriangle,
    bg: "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.3)",
    text: "var(--red)",
    labelKey: "alerts_severity_critical",
  },
  warning: {
    icon: Zap,
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    text: "var(--amber)",
    labelKey: "alerts_severity_warning",
  },
  info: {
    icon: Info,
    bg: "rgba(96,165,250,0.1)",
    border: "rgba(96,165,250,0.25)",
    text: "var(--blue)",
    labelKey: "alerts_severity_info",
  },
};

const HARVEST_STYLE = {
  icon: Scissors,
  bg: "rgba(74,222,128,0.1)",
  border: "rgba(74,222,128,0.3)",
  text: "var(--green)",
  labelKey: "alerts_severity_harvest",
};

const AGENT_COLORS = {
  WATER: "var(--blue)",
  ATMOSPHERIC: "#a78bfa",
  SUPERVISOR: "var(--green)",
  JUDGE: "var(--amber)",
  DOCTOR: "var(--red)",
  HISTORIAN: "var(--text-3)",
};

function AlertCard({ alert, onAck, onUnack, onDismiss, t }) {
  const style = alert.isHarvestAlert
    ? HARVEST_STYLE
    : SEV[alert.severity] || SEV.info;
  const Icon = style.icon || Info;

  // Friendly agent label
  const agentLabel = alert.agent
    ? alert.agent.charAt(0) + alert.agent.slice(1).toLowerCase() + " Agent"
    : "System";

  const cropDisplay =
    alert.crop && alert.crop !== "Unknown Crop"
      ? alert.crop
      : alert.cropId || "Unknown";

  return (
    <div
      className="card-hover"
      style={{
        borderRadius: 12,
        padding: 16,
        background: alert.ack ? "var(--surface)" : style.bg,
        border: `1px solid ${alert.ack ? "var(--border)" : style.border}`,
        opacity: alert.ack ? 0.55 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Severity icon */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: style.bg,
            border: `1px solid ${style.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <Icon size={15} style={{ color: style.text }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: alert.ack ? "var(--text-2)" : "var(--text)",
                lineHeight: 1.3,
              }}
            >
              {alert.title}
            </span>

            {/* Severity badge */}
            <span
              style={{
                fontSize: 9,
                fontFamily: "DM Mono, monospace",
                padding: "2px 7px",
                borderRadius: 4,
                background: style.bg,
                color: style.text,
                border: `1px solid ${style.border}`,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {t(style.labelKey)}
            </span>

            {/* Agent badge */}
            <span
              style={{
                fontSize: 9,
                fontFamily: "DM Mono, monospace",
                padding: "2px 7px",
                borderRadius: 4,
                background: "var(--bg-3)",
                color: AGENT_COLORS[alert.agent] || "var(--text-3)",
                border: "1px solid var(--border)",
              }}
            >
              {agentLabel}
            </span>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: 12,
              color: "var(--text-2)",
              margin: "0 0 8px",
              lineHeight: 1.6,
            }}
          >
            {alert.desc}
          </p>

          {/* Meta row: time + crop */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontFamily: "DM Mono, monospace",
                color: "var(--text-3)",
              }}
            >
              <Clock size={9} />
              {alert.time}
            </span>

            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontFamily: "DM Mono, monospace",
                color: "var(--text-3)",
              }}
            >
              <Leaf size={9} style={{ color: "var(--green)" }} />
              <span style={{ color: "var(--text-2)", fontWeight: 500 }}>
                {cropDisplay}
              </span>
              {alert.cropId && alert.cropId !== cropDisplay && (
                <span style={{ opacity: 0.55 }}>· {alert.cropId}</span>
              )}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {!alert.ack ? (
            <button
              onClick={() => onAck(alert.id)}
              title="Acknowledge"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 150ms, color 150ms",
              }}
            >
              <CheckCircle2 size={13} />
            </button>
          ) : (
            <button
              onClick={() => onUnack(alert.id)}
              title="Unacknowledge"
              style={{
                width: 28,
                height: 28,
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
              <RotateCcw size={13} />
            </button>
          )}
          <button
            onClick={() => onDismiss(alert.id)}
            title="Dismiss"
            style={{
              width: 28,
              height: 28,
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
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// MAIN

export default function Alerts() {
  const { history, loading, refreshData } = useFarmData();
  const { t, td } = useT();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showAcked, setShowAcked] = useState(false);

  useEffect(() => {
    if (!loading) setAlerts(generateAlerts(history, t));
  }, [history, loading, t]);

  const ack = (id) =>
    setAlerts((a) => a.map((al) => (al.id === id ? { ...al, ack: true } : al)));
  const unack = (id) =>
    setAlerts((a) =>
      a.map((al) => (al.id === id ? { ...al, ack: false } : al)),
    );
  const dismiss = (id) => setAlerts((a) => a.filter((al) => al.id !== id));
  const ackAll = () => setAlerts((a) => a.map((al) => ({ ...al, ack: true })));

  const counts = useMemo(
    () => ({
      harvest: alerts.filter((a) => a.isHarvestAlert && (showAcked || !a.ack))
        .length,
      critical: alerts.filter(
        (a) =>
          a.severity === "critical" &&
          (showAcked || !a.ack) &&
          !a.isHarvestAlert,
      ).length,
      warning: alerts.filter(
        (a) => a.severity === "warning" && (showAcked || !a.ack),
      ).length,
      info: alerts.filter(
        (a) =>
          a.severity === "info" && (showAcked || !a.ack) && !a.isHarvestAlert,
      ).length,
      total: alerts.filter((a) => showAcked || !a.ack).length,
    }),
    [alerts, showAcked],
  );

  const filtered = useMemo(
    () =>
      alerts.filter((a) => {
        if (!showAcked && a.ack) return false;
        if (filter === "harvest") return a.isHarvestAlert;
        if (filter !== "all" && a.severity !== filter) return false;
        return true;
      }),
    [alerts, filter, showAcked],
  );

  const unackedList = filtered.filter((a) => !a.ack);
  const ackedList = filtered.filter((a) => a.ack);

  const FILTER_OPTIONS = [
    { key: "all", label: t("common_all"), count: counts.total, color: null },
    {
      key: "harvest",
      label: t("alerts_filter_harvest"),
      count: counts.harvest,
      color: "var(--green)",
    },
    {
      key: "critical",
      label: t("dash_critical"),
      count: counts.critical,
      color: "var(--red)",
    },
    {
      key: "warning",
      label: t("alerts_filter_warning"),
      count: counts.warning,
      color: "var(--amber)",
    },
    {
      key: "info",
      label: t("alerts_filter_info"),
      count: counts.info,
      color: "var(--blue)",
    },
  ];

  return (
    <PageShell>
      {/* Header */}
      <PageHeader
        title={t("alerts_title")}
        subtitle={
          loading
            ? t("alerts_subtitle_loading")
            : t("alerts_subtitle", {
                unacked: counts.total,
                total: alerts.length,
              })
        }
      >
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <IconButton onClick={refreshData}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </IconButton>

          <button
            onClick={() => setShowAcked(!showAcked)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "DM Mono, monospace",
              background: showAcked ? "rgba(74,222,128,0.1)" : "var(--surface)",
              border: `1px solid ${showAcked ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
              color: showAcked ? "var(--green)" : "var(--text-3)",
              cursor: "pointer",
            }}
          >
            {showAcked ? <BellOff size={12} /> : <Bell size={12} />}
            {showAcked ? t("alerts_unacked_only") : t("alerts_show_all")}
          </button>

          <button
            onClick={ackAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "DM Mono, monospace",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-3)",
              cursor: "pointer",
            }}
          >
            <CheckCircle2 size={12} /> {t("alerts_ack_all_btn")}
          </button>
        </div>
      </PageHeader>

      {/* Filter bar */}
      <div
        style={{
          flexShrink: 0,
          padding: "8px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-2)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflowX: "auto",
        }}
      >
        <SlidersHorizontal
          size={14}
          style={{ color: "var(--text-3)", flexShrink: 0 }}
        />
        {FILTER_OPTIONS.map(({ key, label, count, color }) => (
          <FilterPill
            key={key}
            active={filter === key}
            onClick={() => setFilter(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: filter === key ? color || "var(--text)" : "var(--text-3)",
            }}
          >
            {count > 0 && (
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  background: color ? `${color}30` : "var(--border)",
                  color: color || "var(--text-3)",
                }}
              >
                {count}
              </span>
            )}
            {label}
          </FilterPill>
        ))}
      </div>

      {/* Alert list */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {loading ? (
          <LoadingShimmer count={3} height={80} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={
              alerts.length === 0
                ? t("alerts_empty_nodata")
                : t("alerts_empty_connected")
            }
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {/* Active (unacknowledged) */}
            {unackedList.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "DM Mono, monospace",
                    color: "var(--text-3)",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--red)",
                      display: "inline-block",
                    }}
                  />
                  {t("alerts_unacked", { n: unackedList.length })}
                  <span style={{ marginLeft: "auto", opacity: 0.5 }}>
                    newest first
                  </span>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {unackedList.map((a) => (
                    <AlertCard
                      key={a.id}
                      alert={a}
                      onAck={ack}
                      onUnack={unack}
                      onDismiss={dismiss}
                      t={t}
                      td={td}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Acknowledged */}
            {showAcked && ackedList.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "DM Mono, monospace",
                    color: "var(--text-3)",
                    marginBottom: 10,
                  }}
                >
                  {t("alerts_acked", { n: ackedList.length })}
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {ackedList.map((a) => (
                    <AlertCard
                      key={a.id}
                      alert={a}
                      onAck={ack}
                      onUnack={unack}
                      onDismiss={dismiss}
                      t={t}
                      td={td}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
