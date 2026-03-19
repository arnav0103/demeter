import React, { useState, useEffect, createContext, useContext } from "react";
import { fetchDashboardData, fetchAllCropHistories } from "../api/farmApi";

const FarmDataContext = createContext();

export const FarmDataProvider = ({ children }) => {
  const [dashboard, setDashboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      const dash = await fetchDashboardData();
      setDashboard(dash || []);
      const hist = await fetchAllCropHistories(dash || []);
      setHistory(hist || []);
    } catch (error) {
      console.error("Failed to fetch farm data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <FarmDataContext.Provider
      value={{ dashboard, history, loading, refreshData }}
    >
      {children}
    </FarmDataContext.Provider>
  );
};

export const useFarmData = () => useContext(FarmDataContext);
