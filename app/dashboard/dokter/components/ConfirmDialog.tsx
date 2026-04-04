"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

export interface ConfirmDeleteDoctorProps {
  /** Nama dokter yang ditampilkan di teks konfirmasi */
  itemName: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  itemName,
  onConfirm,
  onCancel,
}: ConfirmDeleteDoctorProps) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const handleConfirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await onConfirm();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal menghapus. Coba lagi."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '1rem',
        pointerEvents: 'auto'
      }}
      role="alertdialog"
      aria-modal="true"
    >
        <div
          style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
          onClick={() => !busy && onCancel()}
        />
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: '28rem',
            backgroundColor: '#0c1222',
            borderRadius: '1rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                height: '3rem',
                width: '3rem',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.75rem',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                backgroundColor: 'rgba(69, 10, 10, 0.5)'
              }}>
                <Trash2 style={{ height: '1.5rem', width: '1.5rem', color: '#f87171' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'white', margin: 0 }}>
                  Hapus data dokter?
                </h2>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#d1d5db', lineHeight: 1.5 }}>
                  Anda akan menghapus <span style={{ fontWeight: 600, color: '#fde047' }}>{itemName}</span> secara permanen.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                backgroundColor: '#1f2937',
                color: 'white',
                border: '1px solid #374151',
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                backgroundColor: '#b91c1c',
                color: 'white',
                border: '1px solid #ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {busy ? <Loader2 style={{ height: '1rem', width: '1rem', animation: 'spin 1s linear infinite' }} /> : <Trash2 style={{ height: '1rem', width: '1rem' }} />}
              Hapus
            </button>
          </div>
          {error && <p style={{ color: '#f87171', fontSize: '0.875rem', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
        </div>
    </div>
  );
}
