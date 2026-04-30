"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
  useRef,
  useMemo,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Maximize2,
  Settings,
  Activity,
  Droplets,
  Thermometer,
  Wind,
  ExternalLink,
  LogOut,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlowSheetStore, Resolution } from "@/lib/store/useFlowSheetStore";
import FlowSheetGrid from "@/components/intensive/FlowSheetGrid";
import HemodynamicChart from "@/components/intensive/HemodynamicChart";
import IntensivePatientSidebar, {
  buildIntensivePatientHeadline,
  type IntensiveTindakanListRow,
} from "@/components/intensive/IntensivePatientSidebar";
import JarvisFloatingMenu from "@/components/intensive/JarvisFloatingMenu";
import IccuRegisterModal from "@/components/intensive/iccu/IccuRegisterModal";
import IccuRekapReportModal from "@/components/intensive/iccu/IccuRekapReportModal";
import { startOfDay, format, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { intensiveTimelineTotalWidthPx } from "@/lib/intensive/timelineLayout";
import { latestVitalsSummary } from "@/lib/intensive/latestVitalsFromData";
import { toast } from "sonner";
import { useSession } from "@/app/contexts/SessionContext";
import { UI_LAYERS } from "@/lib/ui/layers";
import {
  runIntensiveJarvisMenuAction,
  IDIK_INTENSIVE_JARVIS_ORBIT_EVENT,
  IDIK_JARVIS_FLOATING_CLOSE_EVENT,
  type IntensiveJarvisOrbitDetail,
} from "@/lib/intensive/jarvisMenuModel";
import {
  normalizeJenisKelamin,
  resolveJenisKelaminFromRow,
  type JenisKelaminLp,
} from "@/app/dashboard/layanan/tindakan/lib/displayTindakanRow";

const DEFAULT_BACK_HREF = "/dashboard/layanan/tindakan";

function honorificTnNy(jk: JenisKelaminLp | null): string {
  if (jk === "L") return "TN.";
  if (jk === "P") return "NY.";
  return "—";
}

/** Tombol kembali ke daftar tindakan: hanya untuk admin / cathlab (bukan akun operasional unit ruangan). */
const INTENSIVE_BACK_TO_TINDAKAN_ROLES = new Set([
  "admin",
  "administrator",
  "superadmin",
  "cathlab",
]);

export type IntensiveDashboardViewProps = {
  patientHeadline?: string | null;
  tindakanId?: string | null;
  embedded?: boolean;
  onRequestClose?: () => void;
  backHref?: string;
  /** Slug unit (`ruangan.slug`) untuk menu Jarvis per ruangan. */
  roomSlug?: string;
  /**
   * Jika `true` dan `roomSlug` awal bukan unit pasti dari URL, setelah mount boleh
   * set ke satu-satunya ruangan dari `/api/me/accessible-ruangan` (user satu unit).
   * Untuk rute `/{room}/dashboard` set `false` agar slug di URL mutlak.
   */
  inferPrimaryUnitFromAccess?: boolean;
  /** Buka menu Jarvis otomatis saat masuk dashboard (halaman /[unit]/dashboard). */
  autoOpenJarvisMenu?: boolean;
};

const TimeResolutionControl = () => {
  const { resolution, setResolution } = useFlowSheetStore();

  return (
    <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
      {(["1m", "15m", "1h"] as Resolution[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setResolution(r)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            resolution === r
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
};

function IntensiveDashboardViewInner({
  patientHeadline,
  tindakanId,
  embedded = false,
  onRequestClose,
  backHref = DEFAULT_BACK_HREF,
  roomSlug = "idik",
  inferPrimaryUnitFromAccess = false,
  autoOpenJarvisMenu = false,
}: IntensiveDashboardViewProps) {
  const [effectiveUnitSlug, setEffectiveUnitSlug] = useState(() =>
    String(roomSlug ?? "idik")
      .trim()
      .toLowerCase(),
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { username, role, setSession, resetSession } = useSession();
  const showIntensiveBackToTindakan = useMemo(() => {
    const r = String(role ?? "")
      .trim()
      .toLowerCase();
    return INTENSIVE_BACK_TO_TINDAKAN_ROLES.has(r);
  }, [role]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSidebar, setShowSidebar] = useState(true);
  const replaceData = useFlowSheetStore((s) => s.replaceData);
  const updateData = useFlowSheetStore((s) => s.updateData);
  const data = useFlowSheetStore((s) => s.data);
  const { resolution } = useFlowSheetStore();

  const loadGenRef = useRef(0);
  const outgoingIdRef = useRef<string | undefined>(undefined);
  const [hydratedForId, setHydratedForId] = useState<string | null>(null);
  const [iccuRegisterOpen, setIccuRegisterOpen] = useState(false);
  const [iccuHistoryOpen, setIccuHistoryOpen] = useState(false);
  const [iccuRekapReportOpen, setIccuRekapReportOpen] = useState(false);
  const [jarvisRoomDisplayName, setJarvisRoomDisplayName] = useState<
    string | null
  >(null);
  /** Pesan dari /api/intensive/jarvis-menu bila ditolak — tampil di header kanan (bukan hanya toast). */
  const [jarvisAccessBanner, setJarvisAccessBanner] = useState<string | null>(
    null,
  );
  const [iccuSidebarListNonce, setIccuSidebarListNonce] = useState(0);
  const bumpIccuSidebarPatientList = useCallback(() => {
    setIccuSidebarListNonce((n) => n + 1);
  }, []);

  const openIccuRekapModal = useCallback(() => {
    setIccuRegisterOpen(false);
    setIccuHistoryOpen(false);
    setIccuRekapReportOpen(true);
  }, []);

  useEffect(() => {
    setEffectiveUnitSlug(
      String(roomSlug ?? "idik")
        .trim()
        .toLowerCase(),
    );
  }, [roomSlug]);

  useEffect(() => {
    if (!inferPrimaryUnitFromAccess) return;
    let cancelled = false;
    void fetch("/api/me/accessible-ruangan", { credentials: "include" })
      .then((r) => r.json())
      .then(
        (d: {
          ok?: boolean;
          data?: { slug: string; nama: string | null }[];
        }) => {
          if (
            cancelled ||
            !d?.ok ||
            !Array.isArray(d.data) ||
            d.data.length !== 1
          ) {
            return;
          }
          const s = d.data[0]?.slug;
          if (typeof s === "string" && s.trim()) {
            setEffectiveUnitSlug(s.trim().toLowerCase());
          }
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [inferPrimaryUnitFromAccess]);

  useEffect(() => {
    setJarvisRoomDisplayName(null);
    setJarvisAccessBanner(null);
  }, [effectiveUnitSlug]);

  /** Sinkron nama user dari cookie JWT (halaman /[room]/dashboard di luar layout dashboard). */
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/refresh", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { ok?: boolean; username?: string; role?: string }) => {
        if (cancelled || !d?.ok) return;
        if (typeof d.username === "string" && d.username.trim()) {
          setSession({
            username: d.username.trim(),
            role: typeof d.role === "string" ? d.role : "user",
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  /** Aksi menu System Menu yang sama dari orbital `JarvisFloatingAgent` (peristiwa window). */
  useEffect(() => {
    const onOrbit = (e: Event) => {
      const d = (e as CustomEvent<IntensiveJarvisOrbitDetail>).detail;
      if (!d?.item || !d.roomSlug) return;
      if (d.roomSlug !== effectiveUnitSlug) return;
      runIntensiveJarvisMenuAction(d.item, {
        onToggleSidebar: () => setShowSidebar((v) => !v),
        onAddPatient: () =>
          toast.info("Fitur Tambah Pasien Intensive dalam pengembangan"),
        onRegisterIccu: () => {
          setIccuHistoryOpen(false);
          setIccuRekapReportOpen(false);
          setIccuRegisterOpen(true);
        },
        onHistoryPasien: () => {
          setIccuRegisterOpen(false);
          setIccuRekapReportOpen(false);
          setIccuHistoryOpen(true);
        },
        onOpenReports: (type) => {
          if (type === "monthly") openIccuRekapModal();
          else toast.info(`Membuka Laporan ${type}...`);
        },
        onIccuRekap: openIccuRekapModal,
        onOpenActionsTable: () => toast.info("Membuka Tabel Tindakan..."),
      });
    };
    window.addEventListener(
      IDIK_INTENSIVE_JARVIS_ORBIT_EVENT,
      onOrbit as EventListener,
    );
    return () =>
      window.removeEventListener(
        IDIK_INTENSIVE_JARVIS_ORBIT_EVENT,
        onOrbit as EventListener,
      );
  }, [effectiveUnitSlug, openIccuRekapModal]);

  /** Modal ICCU/history di atas `jarvisAgent`; tutup orbital agen mengambang agar tidak menutupi / nyangkut. */
  useEffect(() => {
    if (iccuRegisterOpen || iccuHistoryOpen || iccuRekapReportOpen) {
      window.dispatchEvent(new CustomEvent(IDIK_JARVIS_FLOATING_CLOSE_EVENT));
    }
  }, [iccuRegisterOpen, iccuHistoryOpen, iccuRekapReportOpen]);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth", { method: "DELETE", credentials: "include" });
    } catch {
      /* lanjut ke root meski jaringan gagal */
    }
    try {
      localStorage.removeItem("idik_user");
    } catch {
      /* noop */
    }
    resetSession();
    window.location.href = "/";
  }, [loggingOut, resetSession]);

  const vitalsStrip = useMemo(() => latestVitalsSummary(data), [data]);

  const urlTindakanId = embedded
    ? undefined
    : searchParams.get("tindakanId")?.trim() || tindakanId?.trim() || undefined;

  const [embeddedTindakanId, setEmbeddedTindakanId] = useState<
    string | undefined
  >(() => (embedded ? tindakanId?.trim() || undefined : undefined));

  const [patientHeadlineState, setPatientHeadlineState] = useState<
    string | undefined
  >(() => patientHeadline?.trim() || undefined);
  /** Headline baris pertama daftar sidebar — dipakai header bila belum ada `tindakanId` terpilih. */
  const [sidebarFirstHeadline, setSidebarFirstHeadline] = useState<
    string | null
  >(null);
  const [sidebarFirstMeta, setSidebarFirstMeta] = useState<{
    diagnosa: string | null;
    dokter: string | null;
  } | null>(null);
  const [caseDiagnosa, setCaseDiagnosa] = useState<string | null>(null);
  const [caseDokter, setCaseDokter] = useState<string | null>(null);
  const [caseJenisKelamin, setCaseJenisKelamin] =
    useState<JenisKelaminLp | null>(null);
  const [sidebarFirstJk, setSidebarFirstJk] = useState<JenisKelaminLp | null>(
    null,
  );

  const handlePatientListSnapshot = useCallback(
    (
      items: {
        headline: string;
        tindakanId: string | null;
        diagnosa: string | null;
        dokter: string | null;
        jenis_kelamin: JenisKelaminLp | null;
      }[],
    ) => {
      const first = items[0];
      const h = first?.headline?.trim();
      setSidebarFirstHeadline(h ? h : null);
      setSidebarFirstJk(first?.jenis_kelamin ?? null);
      setSidebarFirstMeta(
        first
          ? {
              diagnosa: first.diagnosa?.trim() || null,
              dokter: first.dokter?.trim() || null,
            }
          : null,
      );
    },
    [],
  );

  useEffect(() => {
    if (!embedded) return;
    setEmbeddedTindakanId(tindakanId?.trim() || undefined);
    const h = patientHeadline?.trim();
    if (h) setPatientHeadlineState(h);
  }, [embedded, tindakanId, patientHeadline]);

  const effectiveTindakanId = embedded ? embeddedTindakanId : urlTindakanId;

  /** Muat / simpan flow sheet per pasien + sinkron header dari baris tindakan. */
  useEffect(() => {
    const id = effectiveTindakanId;
    const gen = ++loadGenRef.current;
    const outgoing = outgoingIdRef.current;

    const persist = async (tid: string, snapshot: typeof data) => {
      try {
        await fetch("/api/intensive/flow-sheet", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tindakanId: tid,
            payload: { data: snapshot },
          }),
        });
      } catch {
        /* noop */
      }
    };

    void (async () => {
      if (outgoing && outgoing !== id) {
        await persist(outgoing, useFlowSheetStore.getState().data);
      }

      if (!id) {
        if (gen !== loadGenRef.current) return;
        replaceData({});
        outgoingIdRef.current = undefined;
        setHydratedForId(null);
        if (!embedded) setPatientHeadlineState(undefined);
        setCaseDiagnosa(null);
        setCaseDokter(null);
        setCaseJenisKelamin(null);
        return;
      }

      const [sheetRes, tindakanRes] = await Promise.all([
        fetch(
          `/api/intensive/flow-sheet?tindakanId=${encodeURIComponent(id)}`,
        ).then((r) => r.json()),
        fetch(
          `/api/tindakan?tindakanId=${encodeURIComponent(id)}&limit=1`,
        ).then((r) => r.json()),
      ]);

      if (gen !== loadGenRef.current) return;

      const nextData =
        sheetRes?.ok && sheetRes.payload?.data ? sheetRes.payload.data : {};
      replaceData(nextData);
      outgoingIdRef.current = id;
      setHydratedForId(id);

      if (
        tindakanRes?.ok &&
        Array.isArray(tindakanRes.data) &&
        tindakanRes.data[0]
      ) {
        const row = tindakanRes.data[0] as IntensiveTindakanListRow &
          Record<string, unknown>;
        if (String(row.id ?? "").trim() === id) {
          setPatientHeadlineState(buildIntensivePatientHeadline(row));
          setCaseJenisKelamin(
            resolveJenisKelaminFromRow(row as Record<string, unknown>, null),
          );
          const diag = row.diagnosa;
          const dok = row.dokter;
          setCaseDiagnosa(
            diag != null && String(diag).trim() ? String(diag).trim() : null,
          );
          setCaseDokter(
            dok != null && String(dok).trim() ? String(dok).trim() : null,
          );
          if (diag != null && String(diag).trim()) {
            updateData("diagnosa", "static", String(diag).trim());
          }
        }
      } else if (!embedded) {
        setPatientHeadlineState(`Tindakan ID: ${id}`);
        setCaseDiagnosa(null);
        setCaseDokter(null);
        setCaseJenisKelamin(null);
      } else {
        const h = patientHeadline?.trim();
        setPatientHeadlineState(h || `Tindakan ID: ${id}`);
        setCaseDiagnosa(null);
        setCaseDokter(null);
        setCaseJenisKelamin(null);
      }
    })();
  }, [effectiveTindakanId, embedded, patientHeadline, replaceData, updateData]);

  /** Autosave ringan saat mengedit grid untuk pasien yang sedang aktif. */
  useEffect(() => {
    if (!hydratedForId || hydratedForId !== effectiveTindakanId) return;
    const tid = hydratedForId;
    const t = window.setTimeout(() => {
      void fetch("/api/intensive/flow-sheet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tindakanId: tid,
          payload: { data: useFlowSheetStore.getState().data },
        }),
      });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [data, hydratedForId, effectiveTindakanId]);

  const handleSelectPatient = useCallback(
    (nextId: string, headline: string) => {
      setPatientHeadlineState(headline.trim());
      if (embedded) {
        setEmbeddedTindakanId(nextId);
      } else if (pathname) {
        router.replace(`${pathname}?tindakanId=${encodeURIComponent(nextId)}`, {
          scroll: false,
        });
      }
    },
    [embedded, pathname, router],
  );

  const resolvedHeadline = useMemo(() => {
    const trimmedState = patientHeadlineState?.trim();
    if (effectiveTindakanId) {
      return trimmedState || `Tindakan ID: ${effectiveTindakanId}`;
    }
    if (embedded) {
      return trimmedState || sidebarFirstHeadline || "";
    }
    return sidebarFirstHeadline || "";
  }, [
    effectiveTindakanId,
    embedded,
    patientHeadlineState,
    sidebarFirstHeadline,
  ]);

  const sheetDiagnosaText = String(data["diagnosa"]?.["static"] ?? "").trim();

  const headerDiagnosaDisplay = useMemo(() => {
    if (effectiveTindakanId) {
      return caseDiagnosa?.trim() || sheetDiagnosaText || "";
    }
    return sidebarFirstMeta?.diagnosa?.trim() || sheetDiagnosaText || "";
  }, [effectiveTindakanId, caseDiagnosa, sheetDiagnosaText, sidebarFirstMeta]);

  const headerDokterDisplay = useMemo(() => {
    if (effectiveTindakanId) {
      return caseDokter?.trim() || "";
    }
    return sidebarFirstMeta?.dokter?.trim() || "";
  }, [effectiveTindakanId, caseDokter, sidebarFirstMeta]);

  const patientHonorificPrefix = useMemo(() => {
    const jk = effectiveTindakanId ? caseJenisKelamin : sidebarFirstJk;
    return honorificTnNy(jk);
  }, [effectiveTindakanId, caseJenisKelamin, sidebarFirstJk]);

  const patientHeaderLineTitle = useMemo(() => {
    const p = patientHonorificPrefix;
    const a = resolvedHeadline || "—";
    const b = headerDiagnosaDisplay || "—";
    const c = headerDokterDisplay || "—";
    return `${p} ${a} | ${b} | ${c}`;
  }, [
    patientHonorificPrefix,
    resolvedHeadline,
    headerDiagnosaDisplay,
    headerDokterDisplay,
  ]);

  useEffect(() => {
    const trendScroll = document.getElementById("trend-scroll-container");
    const gridScroll = document.getElementById("flow-sheet-grid-container");

    if (!trendScroll || !gridScroll) return;

    const handleTrendScroll = () => {
      gridScroll.scrollLeft = trendScroll.scrollLeft;
    };

    const handleGridScroll = () => {
      trendScroll.scrollLeft = gridScroll.scrollLeft;
    };

    trendScroll.addEventListener("scroll", handleTrendScroll);
    gridScroll.addEventListener("scroll", handleGridScroll);

    return () => {
      trendScroll.removeEventListener("scroll", handleTrendScroll);
      gridScroll.removeEventListener("scroll", handleGridScroll);
    };
  }, [resolution]);

  const fullPageHref = effectiveTindakanId
    ? `/intensive/dashboard?tindakanId=${encodeURIComponent(effectiveTindakanId)}`
    : "/intensive/dashboard";

  return (
    <div
      className={cn(
        "bg-black text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30",
        embedded ? "min-h-0 h-full" : "min-h-screen",
        isFullscreen && `fixed inset-0 ${UI_LAYERS.fullscreen}`,
      )}
    >
      <header className="flex h-14 min-h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/50 px-3 backdrop-blur-md sm:gap-3 sm:px-4 sticky top-0 z-50">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          {onRequestClose ? (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="text-zinc-400 hover:text-white shrink-0"
              onClick={onRequestClose}
              aria-label="Tutup monitoring ICU"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : showIntensiveBackToTindakan ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white shrink-0"
              asChild
            >
              <Link href={backHref} aria-label="Kembali ke daftar tindakan">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            </Button>
          ) : null}
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <h1 className="flex min-w-0 flex-1 basis-0 items-center gap-2 text-sm font-bold tracking-tight">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-blue-500/30 bg-blue-500/20">
                <Activity className="h-3 w-3 text-blue-400" />
              </div>
              <span
                className="min-w-0 flex-1 truncate text-white dark:text-white"
                title={patientHeaderLineTitle}
              >
                <span className="font-bold text-zinc-100 dark:text-white">
                  {patientHonorificPrefix} {resolvedHeadline || "—"}
                  <span
                    className="mx-1.5 shrink-0 font-normal text-zinc-500 dark:text-white/70"
                    aria-hidden
                  >
                    |
                  </span>
                  {headerDiagnosaDisplay || "—"}
                  <span
                    className="mx-1.5 shrink-0 font-normal text-zinc-500 dark:text-white/70"
                    aria-hidden
                  >
                    |
                  </span>
                  {headerDokterDisplay || "—"}
                </span>
              </span>
            </h1>

            <div
              className="hidden h-8 w-px shrink-0 bg-zinc-800 md:block"
              aria-hidden
            />

            <div className="hidden shrink-0 md:flex">
              <div className="flex min-w-0 max-w-[min(28vw,7.5rem)] flex-col lg:max-w-[min(24vw,10rem)] xl:max-w-[12rem]">
                <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 dark:text-white/85">
                  DIIT
                </span>
                <span
                  className="truncate text-[10px] font-bold uppercase text-blue-400 dark:text-blue-400"
                  title={String(data["diit"]?.["static"] ?? "Belum diisi")}
                >
                  {data["diit"]?.["static"] || "Belum diisi"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {embedded && effectiveTindakanId ? (
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-1.5 h-8 text-[10px]"
              asChild
            >
              <Link href={fullPageHref}>
                <ExternalLink className="w-3.5 h-3.5" />
                Buka layar penuh
              </Link>
            </Button>
          ) : null}

          <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setZoomLevel(zoomLevel === 1 ? 0.8 : 1)}
                className={`h-7 px-3 text-[10px] font-bold transition-all ${
                  zoomLevel === 0.8
                    ? "bg-blue-600 text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {zoomLevel === 0.8 ? "Normal View" : "Zoom Out (80%)"}
              </Button>
            </div>

            <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />

            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">
                Resolusi Waktu
              </span>
              <TimeResolutionControl />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2 h-8"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-xs hidden sm:inline">
                {isFullscreen ? "Exit" : "Full View"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="text-zinc-400"
            >
              <Settings className="w-5 h-5" />
            </Button>
            {jarvisAccessBanner ? (
              <div
                className="flex min-w-0 max-w-[min(50vw,200px)] flex-col items-end justify-center rounded-lg border border-amber-500/40 bg-amber-950/55 px-2 py-1.5 sm:max-w-[280px]"
                role="status"
                title={jarvisAccessBanner}
              >
                <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-amber-300 dark:text-amber-200">
                  <AlertTriangle
                    className="h-3 w-3 shrink-0 text-amber-400"
                    aria-hidden
                  />
                  Menu unit
                </span>
                <span className="mt-0.5 text-right text-[9px] leading-snug text-amber-50 dark:text-white line-clamp-3">
                  {jarvisAccessBanner}
                </span>
              </div>
            ) : null}
            <div
              className="flex items-center gap-1.5 sm:gap-2 pl-1 min-w-0 border-l border-zinc-800 ml-1 shrink-0"
              title={role ? `${username} · ${role}` : username}
            >
              <div className="flex flex-col items-end min-w-0 leading-tight">
                <span className="text-[10px] font-semibold text-white truncate max-w-[140px]">
                  {username && username !== "unknown" ? username : "…"}
                </span>
                <span className="text-[8px] uppercase text-zinc-500 font-bold truncate max-w-[140px]">
                  {role && role !== "guest" ? role : "sesi"}
                </span>
              </div>
              <div
                className="h-9 w-9 shrink-0 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-bold text-zinc-100"
                aria-hidden
              >
                {(username && username !== "unknown"
                  ? username.slice(0, 1)
                  : "?"
                ).toUpperCase()}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={loggingOut}
              className="h-9 w-9 shrink-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
              title={loggingOut ? "Keluar…" : "Logout — ke beranda"}
              aria-label={loggingOut ? "Sedang keluar" : "Logout ke beranda"}
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-row overflow-hidden">
        {showSidebar && (
          <IntensivePatientSidebar
            selectedTindakanId={effectiveTindakanId}
            onSelectPatient={handleSelectPatient}
            iccuActiveListRefreshNonce={iccuSidebarListNonce}
            fallbackUnitSlug={effectiveUnitSlug}
            onPatientListSnapshot={handlePatientListSnapshot}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-zinc-800">
          <div className="bg-zinc-900/30 border-b border-zinc-800/50 px-4 py-2 flex items-center gap-8 overflow-x-auto no-scrollbar">
            <StatMini
              icon={<Activity className="text-red-400" />}
              label="HR"
              value={vitalsStrip.hr}
              unit="bpm"
            />
            <StatMini
              icon={<Activity className="text-blue-400" />}
              label="BP"
              value={vitalsStrip.bp}
              unit="mmHg"
            />
            <StatMini
              icon={<Wind className="text-emerald-400" />}
              label="SpO2"
              value={vitalsStrip.spo2}
              unit="%"
            />
            <StatMini
              icon={<Thermometer className="text-orange-400" />}
              label="TEMP"
              value={vitalsStrip.temp}
              unit="°C"
            />
            <StatMini
              icon={<Droplets className="text-cyan-400" />}
              label="BALANCE"
              value={vitalsStrip.balance}
              unit="ml/24h"
            />
          </div>

          <section className="bg-zinc-950 border-b border-zinc-800 flex overflow-hidden">
            <div className="w-[200px] bg-zinc-900 border-r border-zinc-800 flex items-center px-4 shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  Hemodynamic Trend
                </span>
                <span className="text-[8px] text-zinc-500 uppercase">
                  Real-time Visualization
                </span>
              </div>
            </div>

            <div
              className="flex-1 overflow-x-auto no-scrollbar"
              id="trend-scroll-container"
            >
              <div
                style={{
                  width: `${intensiveTimelineTotalWidthPx(resolution)}px`,
                }}
              >
                <HemodynamicChartContainer />
              </div>
            </div>
          </section>

          <FlowSheetGrid zoomLevel={zoomLevel} />
        </div>

        <aside className="w-[380px] bg-zinc-950 flex flex-col border-l border-zinc-800 overflow-y-auto scrollbar-thin">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Status & Monitoring Statis
            </h3>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <InvasivePanel />
        </aside>
      </main>

      <footer className="h-8 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 text-[10px] text-zinc-500 shrink-0">
        <div className="flex gap-4 min-w-0 truncate">
          <span className="truncate">Server Time: 2026-04-23 21:35:12</span>
          <span className="text-emerald-500 font-bold hidden sm:inline">
            ● Connected to Supabase Realtime
          </span>
        </div>
        <div className="hidden sm:block">
          v0.1.0-alpha • Powered by Antigravity AI
        </div>
      </footer>

      {/* Sembunyikan FAB saat modal register / laporan rekap terbuka — menghindari bentrok FAB dengan kolom Aksi / konten modal. */}
      {!iccuRegisterOpen && !iccuHistoryOpen && !iccuRekapReportOpen ? (
        <JarvisFloatingMenu
          roomSlug={effectiveUnitSlug}
          autoOpenOnMount={!embedded && autoOpenJarvisMenu}
          onRoomMeta={({ nama }) => setJarvisRoomDisplayName(nama)}
          onMenuAccessState={({ ok, userMessage }) => {
            setJarvisAccessBanner(!ok && userMessage ? userMessage : null);
          }}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          onAddPatient={() =>
            toast.info("Fitur Tambah Pasien Intensive dalam pengembangan")
          }
          onRegisterIccu={() => {
            setIccuHistoryOpen(false);
            setIccuRekapReportOpen(false);
            setIccuRegisterOpen(true);
          }}
          onHistoryPasien={() => {
            setIccuRegisterOpen(false);
            setIccuRekapReportOpen(false);
            setIccuHistoryOpen(true);
          }}
          onOpenReports={(type) => {
            if (type === "monthly") openIccuRekapModal();
            else toast.info(`Membuka Laporan ${type}...`);
          }}
          onIccuRekap={openIccuRekapModal}
          onOpenActionsTable={() => toast.info("Membuka Tabel Tindakan...")}
        />
      ) : null}

      <IccuRekapReportModal
        open={iccuRekapReportOpen}
        onOpenChange={setIccuRekapReportOpen}
        roomSlug={effectiveUnitSlug}
        roomDisplayName={jarvisRoomDisplayName ?? undefined}
      />

      <IccuRegisterModal
        open={iccuRegisterOpen}
        onOpenChange={setIccuRegisterOpen}
        roomSlug={effectiveUnitSlug}
        roomDisplayName={jarvisRoomDisplayName ?? undefined}
        mode="register"
        onActiveRegisterListChanged={bumpIccuSidebarPatientList}
      />

      <IccuRegisterModal
        open={iccuHistoryOpen}
        onOpenChange={setIccuHistoryOpen}
        roomSlug={effectiveUnitSlug}
        roomDisplayName={jarvisRoomDisplayName ?? undefined}
        mode="history"
        onActiveRegisterListChanged={bumpIccuSidebarPatientList}
      />
    </div>
  );
}

export default function IntensiveDashboardView(
  props: IntensiveDashboardViewProps,
) {
  return (
    <Suspense
      fallback={
        <div
          className={cn(
            "flex items-center justify-center bg-black text-xs text-zinc-500",
            props.embedded ? "min-h-[240px]" : "min-h-screen",
          )}
        >
          Memuat…
        </div>
      }
    >
      <IntensiveDashboardViewInner {...props} />
    </Suspense>
  );
}

function StatMini({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactElement<{ size?: number }>;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div className="p-1.5 bg-white/5 rounded-md">
        {React.cloneElement(icon, { size: 14 })}
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[9px] text-zinc-500 font-bold uppercase">
          {label}
        </span>
        <span className="text-sm font-bold text-zinc-200">
          {value}{" "}
          <span className="text-[10px] font-normal text-zinc-500 uppercase">
            {unit}
          </span>
        </span>
      </div>
    </div>
  );
}

function HemodynamicChartContainer() {
  const { resolution } = useFlowSheetStore();

  const columns = React.useMemo(() => {
    const start = startOfDay(new Date());
    const cols: Date[] = [];
    const step = resolution === "1m" ? 1 : resolution === "15m" ? 15 : 60;
    const totalMinutes = 24 * 60;

    for (let i = 0; i < totalMinutes; i += step) {
      cols.push(addMinutes(start, i));
    }
    return cols;
  }, [resolution]);

  const width = intensiveTimelineTotalWidthPx(resolution);

  return <HemodynamicChart columns={columns} width={width} />;
}

function InvasivePanel() {
  const { groups, data, updateData } = useFlowSheetStore();
  const rightPanelGroups = groups.filter((g) =>
    ["invasive", "monitoring"].includes(g.id),
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      {rightPanelGroups.map((group) => (
        <div key={group.id} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              {group.name}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {group.parameters.map((param) => (
              <div
                key={param.id}
                className="bg-zinc-900/50 border border-zinc-800 p-2 rounded-lg flex flex-col gap-1.5 hover:border-zinc-700 transition-colors"
              >
                <span
                  className="text-[10px] font-medium text-zinc-400 leading-tight truncate"
                  title={param.name}
                >
                  {param.name}
                </span>

                {param.unit?.toLowerCase().includes("ya/tidak") ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateData(param.id, "static", "Ya")}
                      className={`flex-1 py-1 rounded text-[9px] font-bold transition-all ${
                        data[param.id]?.["static"] === "Ya"
                          ? "bg-blue-600 text-white shadow-[0_0_8_rgba(59,130,246,0.5)]"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => updateData(param.id, "static", "Tidak")}
                      className={`flex-1 py-1 rounded text-[9px] font-bold transition-all ${
                        data[param.id]?.["static"] === "Tidak"
                          ? "bg-zinc-600 text-white shadow-[0_0_8_rgba(113,113,122,0.5)]"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      Tidak
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <input
                      className="bg-transparent text-blue-400 text-xs font-bold outline-none placeholder:text-zinc-700"
                      placeholder={param.unit || "Isi..."}
                      value={data[param.id]?.["static"] || ""}
                      onChange={(e) =>
                        updateData(param.id, "static", e.target.value)
                      }
                    />
                    {param.unit && (
                      <span className="text-[8px] text-zinc-600 font-bold uppercase">
                        {param.unit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <span className="text-[9px] font-bold text-blue-400 uppercase">
          Catatan Khusus ICU
        </span>
        <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
          Panel ini berisi status statis harian. Data di sini tidak terpengaruh
          oleh scroll waktu di kiri.
        </p>
      </div>
    </div>
  );
}
