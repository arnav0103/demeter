import { USE_MOCK_DATA, MOCK_DASHBOARD, MOCK_HISTORY } from "../data/mockData";

const API_BASE_URL =
  process.env.REACT_APP_FARM_API_URL || "http://localhost:3001/api";

// MongoDB CRUD

/**
 * Fetches all crops
 */
export const fetchDashboardData = async () => {
  if (USE_MOCK_DATA) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_DASHBOARD;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/crops/all`);
    if (!res.ok) throw new Error("Network error");
    const json = await res.json();
    // Unwrap { data: [...] } response from the node server
    return json.data || json || [];
  } catch {
    return [];
  }
};

/**
 * Creates a new crop
 */
export const createCrop = async (cropData) => {
  const res = await fetch(`${API_BASE_URL}/crops/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cropData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create crop");
  }
  return res.json();
};

/**
 * Fetches a single crop document by ID
 */
export const fetchCropById = async (cropId) => {
  if (USE_MOCK_DATA) {
    await new Promise((r) => setTimeout(r, 150));
    const found = MOCK_DASHBOARD.find(
      (d) => (d.crop_id || d._id || d.id) === cropId,
    );
    return found || null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/crops/${cropId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
};

/**
 * Partially updates a crop
 */
export const updateCrop = async (cropId, fields) => {
  const res = await fetch(`${API_BASE_URL}/crops/${cropId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update crop");
  }
  return res.json();
};

/**
 * Deletes a crop
 */
export const deleteCrop = async (cropId) => {
  const res = await fetch(`${API_BASE_URL}/crops/${cropId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete crop");
  }
  return res.json();
};

// Qdrant (history / analytics)

/**
 * Fetches the full cycle history for a specific crop
 */
export const fetchCropDetails = async (cropId) => {
  if (USE_MOCK_DATA) {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_HISTORY.filter((h) => h.payload?.crop_id === cropId);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/crop/${cropId}`);
    if (!res.ok) throw new Error("Network error");
    return res.json();
  } catch {
    return [];
  }
};

/**
 * Fetches full history for every crop present in the dashboard snapshot
 * dashboardItems is the raw normalized array (each item has .payload.crop_id or .crop_id)
 */
export const fetchAllCropHistories = async (dashboardItems) => {
  if (USE_MOCK_DATA) {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_HISTORY.sort((a, b) => {
      const ta = new Date(a.payload?.timestamp || 0).getTime();
      const tb = new Date(b.payload?.timestamp || 0).getTime();
      return ta - tb;
    });
  }

  if (!dashboardItems?.length) return [];

  // Support both normalized { payload: { crop_id } } and flat { crop_id }
  const cropIds = [
    ...new Set(
      dashboardItems
        .map((i) => i.payload?.crop_id || i.crop_id)
        .filter(Boolean),
    ),
  ];

  const results = await Promise.allSettled(
    cropIds.map((id) =>
      fetch(`${API_BASE_URL}/crop/${id}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ),
  );

  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return all.sort((a, b) => {
    const ta = new Date(a.payload?.timestamp || 0).getTime();
    const tb = new Date(b.payload?.timestamp || 0).getTime();
    return ta - tb;
  });
};
