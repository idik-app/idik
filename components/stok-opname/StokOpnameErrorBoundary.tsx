"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Resilient Error Boundary khusus Modul Stok Opname.
 * Mencegah aplikasi utama crash ke Root Error Boundary (Sistem Memerlukan Pembaruan Sesi).
 */
export default class StokOpnameErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || "Terjadi kesalahan saat memuat modul Stok Opname.",
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[StokOpnameErrorBoundary]", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-4xl mx-auto space-y-4 text-center">
          <div className="p-6 rounded-2xl border border-amber-500/40 bg-slate-900/90 text-amber-200 shadow-2xl space-y-3">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-base">
              <AlertTriangle className="h-6 w-6" />
              <span>Modul Stok Opname Mengalami Pemulihan Otomatis</span>
            </div>
            <p className="text-xs text-white/80 max-w-md mx-auto">
              Sistem mendeteksi adanya kendala jaringan atau pembaruan berkas di server.
              Tekan tombol di bawah untuk memuat ulang modul secara aman tanpa keluar dari aplikasi.
            </p>
            <div className="text-[11px] font-mono bg-slate-950/80 p-2 rounded border border-amber-900/50 text-amber-300 max-w-lg mx-auto truncate">
              Detail Error: {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 border border-cyan-400 text-white hover:bg-cyan-500 transition-all shadow-md inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Coba Muat Ulang Modul
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
