import { useState } from "react";
import { Pasien } from "../types/pasien";

/* ==========================================================
   📴 usePasienLoader v6.1 — Disabled Mode
   - Tidak auto load
   - Tidak fetch data sama sekali
   - Tabel akan menampilkan data terakhir di context
========================================================== */
export function usePasienLoader(
  _setPatients: React.Dispatch<React.SetStateAction<Pasien[]>>
) {
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    console.log("📴 PasienLoader: tidak melakukan fetch (mode nonaktif)");
    setLoading(false);
  };

  return { loading, refresh };
}
