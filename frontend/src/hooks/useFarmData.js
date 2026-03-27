import React, { useState, useEffect, createContext, useContext } from "react";
import { fetchDashboardData, fetchAllCropHistories } from "../api/farmApi";
import { normalizeMongoCrop } from "../utils/dataUtils";

const FarmDataContext = createContext();

export const FarmDataProvider = ({ children }) => {
  const [dashboard, setDashboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      // fetchDashboardData now returns raw MongoDB docs (or MOCK_DASHBOARD)
      const raw = await fetchDashboardData();

      // Normalize each MongoDB doc into { id, payload: {...} } shape
      // so all downstream components (Dashboard, Alerts, Analytics, Sidebar) work unchanged
      const normalized = (raw || [])
        .map((doc) => {
          // If doc already has a payload key (mock data in old shape), passthrough
          if (doc && doc.payload) return doc;
          return normalizeMongoCrop(doc);
        })
        .filter(Boolean);

      setDashboard(normalized);

      // Fetch Qdrant history using the normalized array (farmApi handles both shapes)
      const hist = await fetchAllCropHistories(normalized);
      setHistory(hist || []);
    } catch (error) {
      console.error("Failed to fetch farm data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <FarmDataContext.Provider
      value={{ dashboard, history, loading, refreshData }}
    >
      {children}
    </FarmDataContext.Provider>
  );
};

export const useFarmData = () => useContext(FarmDataContext);
