type DataMap = Record<string, Record<string, string | number>>;

function latestTimestampForParam(
  data: DataMap,
  paramId: string,
): string | null {
  const m = data[paramId];
  if (!m || typeof m !== "object") return null;
  const keys = Object.keys(m).filter((k) => k !== "static").sort();
  return keys.length ? keys[keys.length - 1]! : null;
}

/** Ringkasan strip vital dari flow sheet (nilai terbaru berdasarkan timestamp). */
export function latestVitalsSummary(data: DataMap): {
  hr: string;
  bp: string;
  spo2: string;
  temp: string;
  balance: string;
} {
  const ts =
    latestTimestampForParam(data, "hr") ||
    latestTimestampForParam(data, "bp_s") ||
    latestTimestampForParam(data, "spo2");

  const pick = (paramId: string): string => {
    if (!ts) return "—";
    const v = data[paramId]?.[ts];
    if (v == null || v === "") return "—";
    return String(v);
  };

  const hr = pick("hr");
  const bps = pick("bp_s");
  const bpd = pick("bp_d");
  let bp = "—";
  if (bps !== "—" || bpd !== "—") bp = `${bps}/${bpd}`;

  const spo2 = pick("spo2");

  let temp = "—";
  const tempTs = latestTimestampForParam(data, "temp");
  if (tempTs && data.temp?.[tempTs] != null) temp = String(data.temp[tempTs]);
  else if (data.temp?.["static"] != null && String(data.temp["static"]).trim())
    temp = String(data.temp["static"]);

  let balance = "—";
  if (data.balance_cum?.["static"] != null && String(data.balance_cum["static"]).trim()) {
    balance = String(data.balance_cum["static"]);
  } else {
    const bts = latestTimestampForParam(data, "balance_cum");
    if (bts && data.balance_cum?.[bts] != null) balance = String(data.balance_cum[bts]);
  }
  if (balance !== "—" && !/^[-+]/.test(balance)) balance = `+${balance}`;

  return { hr, bp, spo2, temp, balance };
}
