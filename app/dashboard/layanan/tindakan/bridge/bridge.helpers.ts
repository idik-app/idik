// ========================================================================
// 📌 bridge.helpers.ts — Helper Functions for Tindakan Bridge Layer
// ========================================================================

// ------------------------------
// VALUE SAFETY
// ------------------------------
export const safe = (v: any, fallback = "-") => {
  if (v === null || v === undefined || v === "") return fallback;
  return v;
};

export const safeStr = (v: any) => {
  if (v === null || v === undefined) return "";
  return String(v);
};

export const safeNum = (v: any) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

// ------------------------------
// DATE / TIME FORMAT
// ------------------------------
export const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export const formatTime = (timeStr: string | null) => {
  if (!timeStr) return "-";
  try {
    return timeStr.substring(0, 5); // "HH:mm:ss" → "HH:mm"
  } catch {
    return timeStr;
  }
};

// ------------------------------
// AGE FORMAT
// ------------------------------
export const formatAge = (umur: any) => {
  if (umur === null || umur === undefined) return "-";
  return `${umur} th`;
};

// ------------------------------
// FINANCIAL FORMAT
// ------------------------------
export const formatCurrency = (val: number | null) => {
  const n = safeNum(val);
  return n.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });
};

// ------------------------------
// SEVERITY / STATUS STYLES
// ------------------------------
export const severityColor = (level: string | null) => {
  if (!level) return "text-gray-400";

  const map: Record<string, string> = {
    Low: "text-green-400",
    Moderate: "text-yellow-400",
    High: "text-orange-400",
    Critical: "text-red-500",
  };

  return map[level] ?? "text-gray-400";
};

export const statusColor = (status: string | null) => {
  if (!status) return "text-gray-400";

  const map: Record<string, string> = {
    Selesai: "text-green-400",
    Proses: "text-cyan-400",
    Pending: "text-yellow-400",
    Dibatalkan: "text-red-500",
  };

  return map[status] ?? "text-gray-400";
};

// ------------------------------
// SAFE JSON PARSE
// ------------------------------
export const safeJson = (value: any) => {
  try {
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
};
