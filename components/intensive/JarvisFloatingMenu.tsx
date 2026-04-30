"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import {
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Settings,
  GripVertical,
} from "lucide-react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { roomDisplayLabelFromSlug } from "@/lib/ruangan/slug";
import { UI_LAYERS } from "@/lib/ui/layers";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import "@/app/styles/jarvis-floating-menu.css";
import {
  type IntensiveJarvisMenuItem,
  normalizeIntensiveMenuRow,
  intensiveMenuDisplayLabel,
  runIntensiveJarvisMenuAction,
} from "@/lib/intensive/jarvisMenuModel";

type MenuItem = IntensiveJarvisMenuItem;

function normalizeMenuRow(row: Record<string, unknown>): MenuItem {
  return normalizeIntensiveMenuRow(row);
}

function reorderMenuItems(
  list: MenuItem[],
  fromIndex: number,
  toIndex: number,
): MenuItem[] {
  const next = list.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);
  return next.map((it, i) => ({ ...it, order_index: i }));
}

function toEditingSnapshot(item: MenuItem): MenuItem {
  return {
    id: item.id,
    label: item.label,
    icon_name: item.icon_name,
    action_type: item.action_type,
    action_value: item.action_value,
    order_index: item.order_index,
  };
}

/**
 * Pola tema → ikon Lucide (urutan: spesifik dulu). Tidak cocok → coba kata di label
 * sebagai nama komponen Lucide (PascalCase), lalu fallback Circle.
 */
const LABEL_ICON_RULES: { test: (s: string) => boolean; icon: string }[] = [
  {
    test: (s) =>
      /sidebar|buka|tutup|panel|drawer|toggle\s*side|side\s*bar/i.test(s),
    icon: "Menu",
  },
  {
    test: (s) => /tindakan|clipboard|daftar|list/i.test(s),
    icon: "ClipboardList",
  },
  { test: (s) => /pasien|tambah.*orang|registras/i.test(s), icon: "UserPlus" },
  { test: (s) => /minggu|weekly|mingguan/i.test(s), icon: "CalendarDays" },
  { test: (s) => /bulan|bulanan|monthly/i.test(s), icon: "CalendarRange" },
  {
    test: (s) => /harian|daily|per\s*hari|file.*text|laporan|report/i.test(s),
    icon: "FileText",
  },
  {
    test: (s) => /http|url|taut|link|external|buka.*tab|www\./i.test(s),
    icon: "ExternalLink",
  },
  { test: (s) => /dokumen|berkas|arsip|document/i.test(s), icon: "File" },
  {
    test: (s) => /pengatur|setting|config|sistem|gear|preferen/i.test(s),
    icon: "Settings",
  },
  {
    test: (s) => /chart|stat|graf|monitor|tren|kpi|ringkasan\s*angka/i.test(s),
    icon: "Activity",
  },
  {
    test: (s) => /beranda|home|utama|dashboard|overview/i.test(s),
    icon: "LayoutDashboard",
  },
  { test: (s) => /cari|search|temukan|find/i.test(s), icon: "Search" },
  {
    test: (s) => /cetak|print|ekspor|export|unduh|download/i.test(s),
    icon: "Download",
  },
  { test: (s) => /unggah|upload|impor|import/i.test(s), icon: "Upload" },
  { test: (s) => /obat|farmasi|resep|pill|drug/i.test(s), icon: "Pill" },
  { test: (s) => /radiolog|foto(?!kopi)|gambar|image/i.test(s), icon: "Image" },
  {
    test: (s) => /laborat|pemeriksaan\s*lab|spesimen|test\s*tube/i.test(s),
    icon: "TestTube",
  },
  {
    test: (s) =>
      /darurat|gawat|icu|emergency|ambulans|trauma|code\s*blue/i.test(s),
    icon: "Siren",
  },
  {
    test: (s) => /kamar|rawat\s*inap|hospital|bed(?!\s*side)/i.test(s),
    icon: "BedDouble",
  },
  { test: (s) => /jantung|kardi|heart(?!.)/i.test(s), icon: "HeartPulse" },
  { test: (s) => /stetos|steth|paru|napas(?!.)/i.test(s), icon: "Stethoscope" },
  { test: (s) => /suntik|vaksin|infus|injeksi/i.test(s), icon: "Syringe" },
  {
    test: (s) => /dokter|dokt|d\.dr|physician|dr\.?/i.test(s),
    icon: "UserCog",
  },
  { test: (s) => /perawat|nurs|bidan|tim\s*bed/i.test(s), icon: "Users" },
  {
    test: (s) => /telepon|kontak|hp\b|handphone|whatsapp|call(?!.)/i.test(s),
    icon: "Phone",
  },
  { test: (s) => /\bvideo\b|kamera|rekam/i.test(s), icon: "Video" },
  { test: (s) => /email|e-mail|surat(?!.)/i.test(s), icon: "Mail" },
  { test: (s) => /peta|map|lokasi|gps/i.test(s), icon: "MapPin" },
  { test: (s) => /buku|book|jurnal|referensi/i.test(s), icon: "BookOpen" },
  {
    test: (s) => /bantuan|help|faq|panduan|tutorial/i.test(s),
    icon: "HelpCircle",
  },
  {
    test: (s) => /peringat|perhat|alert|warning|kritis|bahaya/i.test(s),
    icon: "AlertCircle",
  },
  {
    test: (s) => /kunci|password|login|authent|mfa/i.test(s),
    icon: "KeyRound",
  },
  { test: (s) => /gembok|lock|enkr(?!.)/i.test(s), icon: "Lock" },
  { test: (s) => /notif|bell|push/i.test(s), icon: "Bell" },
  {
    test: (s) => /waktu|jadwal|antrian|queue|reserv(?!.)/i.test(s),
    icon: "Clock",
  },
  { test: (s) => /bintang|favorit|star|pin(?!.)/i.test(s), icon: "Star" },
  { test: (s) => /secur|shield|amank(?!.)/i.test(s), icon: "Shield" },
  { test: (s) => /tabel|pivot(?!.)/i.test(s), icon: "Table2" },
  { test: (s) => /saring|filter|urut|sort(?!.)/i.test(s), icon: "Filter" },
  {
    test: (s) => /pengguna|akun|user|profil|account(?!.)/i.test(s),
    icon: "User",
  },
  { test: (s) => /tim|team|grup|group(?!.)/i.test(s), icon: "UsersRound" },
  { test: (s) => /database|gudang\s*data/i.test(s), icon: "Database" },
  {
    test: (s) => /tagihan|harga|billing|uang|payment/i.test(s),
    icon: "Banknote",
  },
  { test: (s) => /folder(?!.)/i.test(s), icon: "FolderOpen" },
  {
    test: (s) => /diet|nutris|gizi|makan(?!.)/i.test(s),
    icon: "UtensilsCrossed",
  },
  { test: (s) => /cair|infus|drip(?!.)/i.test(s), icon: "Droplet" },
  { test: (s) => /gds|gula|glukosa|insulin|diab/i.test(s), icon: "Candy" },
  { test: (s) => /suhu|thermo|panas(?!.)/i.test(s), icon: "Thermometer" },
  { test: (s) => /nadi|tensi|tekanan\s*darah(?!.)/i.test(s), icon: "Waves" },
  { test: (s) => /napas|oksigen|spo2|o2(?!.)/i.test(s), icon: "Wind" },
  {
    test: (s) => /tambah|tambh|add|new|create|buat(?!\s*kan)/i.test(s),
    icon: "Plus",
  },
  { test: (s) => /zap|spark|kilat|lightning(?!.)/i.test(s), icon: "Zap" },
];

function isLucideComponentName(name: string): boolean {
  if (!name) return false;
  const I = (LucideIcons as Record<string, unknown>)[name];
  return typeof I === "function" || (typeof I === "object" && I != null);
}

/** Coba jadikan tiap token label sebagai nama ikon Lucide (PascalCase), mis. "Activity". */
function tryPascalTokenAsIconName(label: string): string | null {
  const parts = label
    .trim()
    .split(/[\s\-_/]+/)
    .filter((p) => p.length > 0);
  for (const raw of parts) {
    const alnum = raw.replace(/[^A-Za-z0-9]/g, "");
    if (alnum.length < 2) continue;
    const pascal = alnum.charAt(0).toUpperCase() + alnum.slice(1).toLowerCase();
    if (isLucideComponentName(pascal)) return pascal;
  }
  return null;
}

/**
 * Ikon otomatis: pola tema label → kunci Lucide; lalu coba token sebagai nama komponen; fallback.
 */
function iconNameFromLabel(label: string): string {
  const s = label.trim();
  if (!s) return "HelpCircle";
  const lower = s.toLowerCase();
  for (const { test, icon } of LABEL_ICON_RULES) {
    if (test(lower) && isLucideComponentName(icon)) return icon;
  }
  const fromToken = tryPascalTokenAsIconName(s);
  if (fromToken) return fromToken;
  return isLucideComponentName("Circle") ? "Circle" : "HelpCircle";
}

interface JarvisFloatingMenuProps {
  /** Slug `public.ruangan.slug`; menu disimpan per ruangan (tidak tertukar antar unit). */
  roomSlug: string;
  /** Saat mount halaman dashboard unit: menu terbuka dulu (bukan cuma dekat Fab). */
  autoOpenOnMount?: boolean;
  onToggleSidebar?: () => void;
  onAddPatient?: () => void;
  /** Item menu `action_value` register unit (iccu/ruangan) — buka modal daftar. */
  onRegisterIccu?: () => void;
  /** Item menu history pasien / arsip ICCU. */
  onHistoryPasien?: () => void;
  onOpenReports?: (type: "daily" | "weekly" | "monthly") => void;
  /** Item menu `action_value` khusus rekap ICCU (`laporan_iccu_rekap` / `iccu_rekap`). */
  onIccuRekap?: () => void;
  onOpenActionsTable?: () => void;
  /** Dipanggil setelah menu termuat: `nama` dari master `ruangan` (untuk judul modal register). */
  onRoomMeta?: (meta: { nama: string }) => void;
  /**
   * Setelah GET /api/intensive/jarvis-menu selesai: sukses atau gagal (403/dll).
   * Dipakai parent untuk banner di header (bukan hanya toast).
   */
  onMenuAccessState?: (s: { ok: boolean; userMessage: string | null }) => void;
}

/**
 * Jarak maks. kursor → pusat FAB (px) agar menu auto-buka. Nilai kecil: baru saat
 * benar-benar mendekati tombol, bukan dari jauh.
 */
const PROXIMITY_OPEN_PX = 56;
/** Setelah user menutup menu, jangan auto-buka lagi sampai kursor keluar (sedikit di luar batas buka) — cegah buka-buka saat klik di luar. */
const PROXIMITY_REARM_PX = PROXIMITY_OPEN_PX + 14;

function apiFailureMessage(
  json: { error?: unknown; message?: unknown },
  fallback: string,
) {
  const e =
    typeof json.error === "string" && json.error.trim() ? json.error : "";
  const m =
    typeof json.message === "string" && json.message.trim() ? json.message : "";
  return e || m || fallback;
}

/** Teks tampilan untuk 403 / unit tidak sejalan dengan login (header + toast). */
const UNIT_ACCESS_DENIED_USER_MESSAGE =
  "Akses ditolak ke unit ini (unit tidak sesuai login).";

export default function JarvisFloatingMenu({
  roomSlug,
  autoOpenOnMount = false,
  onToggleSidebar,
  onAddPatient,
  onRegisterIccu,
  onHistoryPasien,
  onOpenReports,
  onIccuRekap,
  onOpenActionsTable,
  onRoomMeta,
  onMenuAccessState,
}: JarvisFloatingMenuProps) {
  const onRoomMetaRef =
    useRef<JarvisFloatingMenuProps["onRoomMeta"]>(onRoomMeta);
  onRoomMetaRef.current = onRoomMeta;
  const onMenuAccessRef = useRef(onMenuAccessState);
  onMenuAccessRef.current = onMenuAccessState;

  const [isOpen, setIsOpen] = useState(!!autoOpenOnMount);
  const [isEditMode, setIsEditMode] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  /** Awal `true` sampai prefetch pertama; panel bisa tunjuk LOADING bila perlu. */
  const [isLoading, setIsLoading] = useState(true);
  const [roomNama, setRoomNama] = useState("");
  /** `null` = belum selesai fetch unit ini; `false` = tidak boleh pakai menu (sembunyikan FAB). */
  const [menuAccessOk, setMenuAccessOk] = useState<boolean | null>(null);

  // For editing
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fabButtonRef = useRef<HTMLButtonElement>(null);
  const proximityRaf = useRef<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  /** Set false saat `closePanel` — proximity baru boleh buka setelah kursor lewat pinggir (re-arm). */
  const allowProximityOpenRef = useRef(true);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setIsEditMode(false);
    setEditingItem(null);
    allowProximityOpenRef.current = false;
  }, []);

  // Dashboard unit: buka lagi saat ganti unit (navigasi /iccu/dashboard → /idik/dashboard).
  useEffect(() => {
    if (!autoOpenOnMount) return;
    allowProximityOpenRef.current = true;
    setIsOpen(true);
  }, [roomSlug, autoOpenOnMount]);

  const slugParam = (roomSlug ?? "idik").trim().toLowerCase();
  const menuQuery = `roomSlug=${encodeURIComponent(slugParam)}`;

  const fetchMenuItems = useCallback(async () => {
    setMenuAccessOk(null);
    try {
      setIsLoading(true);
      const res = await fetch(`/api/intensive/jarvis-menu?${menuQuery}`);
      const json = (await res.json()) as {
        ok?: boolean;
        data?: unknown;
        roomNama?: unknown;
        error?: unknown;
        message?: unknown;
      };
      if (json.ok) {
        const raw = (json.data ?? []) as Record<string, unknown>[];
        setMenuItems(raw.map((row) => normalizeMenuRow(row)));
        const n = String(json.roomNama ?? "").trim();
        setRoomNama(n);
        onRoomMetaRef.current?.({
          nama: n || roomDisplayLabelFromSlug(slugParam),
        });
        setMenuAccessOk(true);
        onMenuAccessRef.current?.({ ok: true, userMessage: null });
      } else {
        const errMsg =
          res.status === 403
            ? UNIT_ACCESS_DENIED_USER_MESSAGE
            : apiFailureMessage(json, "Gagal memuat menu Jarvis");
        toast.error(errMsg);
        setMenuItems([]);
        setRoomNama("");
        setMenuAccessOk(false);
        onMenuAccessRef.current?.({ ok: false, userMessage: errMsg });
        setIsOpen(false);
        setIsEditMode(false);
        setEditingItem(null);
      }
    } catch (err) {
      console.error("Failed to fetch menu items", err);
      const errMsg = "Gagal memuat menu Jarvis (jaringan)";
      toast.error(errMsg);
      setMenuItems([]);
      setRoomNama("");
      setMenuAccessOk(false);
      onMenuAccessRef.current?.({ ok: false, userMessage: errMsg });
      setIsOpen(false);
      setIsEditMode(false);
      setEditingItem(null);
    } finally {
      setIsLoading(false);
    }
  }, [menuQuery, roomSlug]);

  /** Prefetch setiap ganti `roomSlug` / saat mount — item siap sebelum / sesudah buka panel (unit sesuai login). */
  useEffect(() => {
    void fetchMenuItems();
  }, [fetchMenuItems]);

  // Dekat FAB → buka menu (pusat stabil dari ref tombol; tanpa auto-tutup berdasarkan jarak).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (isOpen || isEditMode || editingItem) return;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      if (proximityRaf.current != null) return;
      proximityRaf.current = requestAnimationFrame(() => {
        proximityRaf.current = null;
        const el = fabButtonRef.current;
        if (!el) return;
        const { x, y } = lastPointerRef.current;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(x - cx, y - cy);
        if (!allowProximityOpenRef.current) {
          if (d >= PROXIMITY_REARM_PX) {
            allowProximityOpenRef.current = true;
          }
          return;
        }
        if (d < PROXIMITY_OPEN_PX) setIsOpen(true);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (proximityRaf.current != null)
        cancelAnimationFrame(proximityRaf.current);
    };
  }, [isOpen, isEditMode, editingItem]);

  // Escape: close editor first, then full panel.
  useEffect(() => {
    if (!isOpen && !editingItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editingItem) setEditingItem(null);
      else if (isOpen) closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, editingItem, closePanel]);

  const autoIconPreview = editingItem
    ? iconNameFromLabel(editingItem.label ?? "")
    : "HelpCircle";

  const itemDisplayLabel = useCallback(
    (item: MenuItem) => intensiveMenuDisplayLabel(item, roomNama, roomSlug),
    [roomNama, roomSlug],
  );

  const handleAction = (item: MenuItem) => {
    if (isEditMode) return;
    runIntensiveJarvisMenuAction(item, {
      onToggleSidebar,
      onAddPatient,
      onRegisterIccu,
      onHistoryPasien,
      onOpenReports,
      onIccuRekap,
      onOpenActionsTable,
    });
  };

  const saveItem = async () => {
    const label = (editingItem?.label ?? "").trim();
    if (!label) {
      toast.error("Label wajib diisi");
      return;
    }

    if (!editingItem) return;

    const icon_name = iconNameFromLabel(label);
    const payload: Partial<MenuItem> = {
      ...editingItem,
      label,
      icon_name,
    };
    if (payload.action_type === "sidebar_toggle") {
      const v = payload.action_value;
      if (v == null || String(v).trim() === "") payload.action_value = null;
    }

    try {
      const res = await fetch(`/api/intensive/jarvis-menu?${menuQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Menu berhasil disimpan");
        setEditingItem(null);
        fetchMenuItems();
      } else {
        toast.error(apiFailureMessage(json, "Gagal menyimpan"));
      }
    } catch (err) {
      toast.error("Kesalahan koneksi");
    }
  };

  const runConfirmedDelete = async () => {
    if (!pendingDelete) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(
        `/api/intensive/jarvis-menu?id=${encodeURIComponent(pendingDelete.id)}&${menuQuery}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (json.ok) {
        toast.success("Menu dihapus");
        setPendingDelete(null);
        fetchMenuItems();
      } else {
        toast.error(apiFailureMessage(json, "Gagal menghapus"));
      }
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const persistMenuOrder = useCallback(
    async (ordered: MenuItem[]) => {
      const orderedIds = ordered.map((x) => x.id);
      try {
        const res = await fetch(`/api/intensive/jarvis-menu?${menuQuery}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        });
        const json = await res.json();
        if (!json.ok) {
          toast.error(apiFailureMessage(json, "Gagal menyimpan urutan"));
          fetchMenuItems();
          return;
        }
        toast.success("Urutan menu disimpan", { duration: 2200 });
      } catch {
        toast.error("Gagal menyimpan urutan");
        fetchMenuItems();
      }
    },
    [fetchMenuItems, menuQuery],
  );

  /** `persistMenuOrder` hanya simpan urutan (PATCH); isi list = `menuItems` dari API/DB, bukan di sini. */
  const onMenuDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      if (result.source.index === result.destination.index) return;
      setMenuItems((prev) => {
        const next = reorderMenuItems(
          prev,
          result.source.index,
          result.destination!.index,
        );
        void persistMenuOrder(next);
        return next;
      });
    },
    [persistMenuOrder],
  );

  const renderIcon = (name: string, className = "w-5 h-5") => {
    const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
    return <Icon className={className} />;
  };

  if (menuAccessOk === false) {
    return null;
  }

  return (
    <>
      {isOpen && (
        <div
          className={cn(
            "jarvis-menu-backdrop fixed inset-0 bg-black/20",
            UI_LAYERS.jarvisMenuBackdrop,
          )}
          aria-hidden
          onPointerDown={(e) => {
            e.stopPropagation();
            closePanel();
          }}
        />
      )}

      <div className={cn("jarvis-menu-container", UI_LAYERS.fullscreen)}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="jarvis-menu-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                "jarvis-expanded-menu jarvis-panel rounded-2xl relative z-10",
                isEditMode && "w-[min(92vw,480px)] max-w-[480px] sm:w-[480px]",
                editingItem && "min-h-[min(88vh,640px)]",
              )}
            >
              <div className="bracket-bottom-left" />
              <div className="bracket-bottom-right" />

              <div className="flex flex-col gap-1">
                <div className="px-3 py-2 mb-2 border-b border-cyan-500/20 flex justify-between items-center">
                  <div>
                    <h3 className="jarvis-title text-xs font-bold">
                      System Menu
                    </h3>
                    <p className="text-[8px] font-mono text-cyan-200/90">
                      {isEditMode
                        ? "CONFIGURATION MODE"
                        : "AUTHORIZED ACCESS ONLY"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={cn(
                      "jarvis-header-settings-btn",
                      isEditMode && "jarvis-header-settings-btn--config",
                    )}
                    title={
                      isEditMode
                        ? "Keluar mode konfigurasi"
                        : "Konfigurasi menu"
                    }
                  >
                    <Settings className="h-4 w-4" strokeWidth={2.25} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="p-4 text-center jarvis-data text-[10px] text-cyan-500/50">
                    LOADING DATA...
                  </div>
                ) : (
                  <>
                    {isEditMode ? (
                      <DragDropContext onDragEnd={onMenuDragEnd}>
                        <Droppable droppableId="jarvis-menu-list">
                          {(dropProvided) => (
                            <div
                              ref={dropProvided.innerRef}
                              {...dropProvided.droppableProps}
                              className="flex flex-col gap-1"
                            >
                              {menuItems.map((item, index) => (
                                <Draggable
                                  key={item.id}
                                  draggableId={item.id}
                                  index={index}
                                >
                                  {(dragProvided, snapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      style={dragProvided.draggableProps.style}
                                      className={cn(
                                        "jarvis-menu-item group rounded-lg cursor-default",
                                        snapshot.isDragging &&
                                          "z-[100] border border-cyan-500/30 bg-zinc-900/50 shadow-md ring-1 ring-cyan-500/25",
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className="flex cursor-grab shrink-0 items-center self-stretch pr-0.5 text-cyan-500/70 hover:text-cyan-200 active:cursor-grabbing"
                                        title="Geser untuk mengurutkan"
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                      <div className="shrink-0 text-cyan-400 group-hover:text-cyan-200">
                                        {renderIcon(item.icon_name)}
                                      </div>
                                      <span className="label text-cyan-100 flex-1 truncate">
                                        {item.label}
                                      </span>
                                      <div className="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setEditingItem(
                                              toEditingSnapshot(item),
                                            );
                                          }}
                                          className="rounded p-1.5 text-cyan-200 ring-1 ring-cyan-500/25 hover:bg-cyan-500/20 hover:text-cyan-50"
                                          aria-label="Edit item"
                                        >
                                          <Edit2
                                            className="h-3.5 w-3.5"
                                            strokeWidth={2.25}
                                          />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setPendingDelete({
                                              id: item.id,
                                              label: item.label,
                                            });
                                          }}
                                          className="rounded p-1.5 text-rose-300/95 ring-1 ring-rose-500/20 hover:bg-rose-500/20 hover:text-rose-100"
                                          aria-label="Hapus item"
                                        >
                                          <Trash2
                                            className="h-3.5 w-3.5"
                                            strokeWidth={2.25}
                                          />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {dropProvided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    ) : (
                      menuItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="jarvis-menu-item group cursor-pointer rounded-lg w-full border-transparent bg-transparent text-left font-inherit text-inherit"
                          onClick={() => handleAction(item)}
                        >
                          <div className="shrink-0 text-cyan-400 group-hover:text-cyan-200">
                            {renderIcon(item.icon_name)}
                          </div>
                          <span className="label text-cyan-100 flex-1 truncate">
                            {itemDisplayLabel(item)}
                          </span>
                          <div className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                            <ChevronRight className="h-3 w-3 text-cyan-500" />
                          </div>
                        </button>
                      ))
                    )}

                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingItem({
                            label: "",
                            icon_name: "HelpCircle",
                            action_type: "function",
                            action_value: null,
                            order_index: menuItems.length,
                          })
                        }
                        className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-cyan-500/50 p-2 text-[10px] font-bold uppercase text-cyan-200 transition-colors hover:border-cyan-400/70 hover:text-cyan-50"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.25} /> Add
                        Item
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Modal Edit / Add Inline */}
              <AnimatePresence>
                {editingItem && (
                  <motion.div
                    key={editingItem.id || "new-item"}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="absolute inset-0 z-20 flex flex-col rounded-2xl border border-cyan-500/50 bg-[#001428f2] p-5 backdrop-blur-md sm:p-7"
                  >
                    <div className="mb-5 flex shrink-0 items-center justify-between gap-3 border-b border-cyan-500/15 pb-4">
                      <h4 className="jarvis-title text-sm font-bold tracking-[0.2em] sm:text-base">
                        Edit MenuItem
                      </h4>
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="rounded p-1 text-cyan-200 hover:bg-cyan-500/15 hover:text-white"
                        aria-label="Tutup editor"
                      >
                        <X className="h-4 w-4" strokeWidth={2.25} />
                      </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-zinc-200">
                          LABEL
                        </label>
                        <input
                          className="jarvis-data min-h-[44px] w-full rounded-md border border-cyan-500/35 bg-zinc-950/90 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30"
                          value={editingItem.label ?? ""}
                          onChange={(e) => {
                            const label = e.target.value;
                            setEditingItem({
                              ...editingItem,
                              label,
                              icon_name: iconNameFromLabel(label),
                            });
                          }}
                          placeholder="Menu Label"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>

                      <div className="flex items-center gap-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-cyan-500/35 bg-cyan-500/10 text-cyan-200 [&_svg]:h-7 [&_svg]:w-7">
                          {renderIcon(autoIconPreview)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-500">
                            Ikon (otomatis)
                          </p>
                          <p className="truncate font-mono text-sm text-cyan-200/95">
                            {autoIconPreview}
                          </p>
                        </div>
                      </div>

                      {editingItem.action_type === "sidebar_toggle" && (
                        <div className="flex flex-col gap-3 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-4">
                          <p className="text-xs font-semibold tracking-wide text-zinc-200">
                            ACTION TYPE
                          </p>
                          <p className="text-sm text-cyan-200">
                            Sidebar Toggle
                          </p>
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold tracking-wide text-zinc-200">
                              ACTION VALUE
                            </label>
                            <input
                              className="jarvis-data min-h-[44px] w-full rounded-md border border-cyan-500/35 bg-zinc-950/90 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30"
                              value={editingItem.action_value ?? ""}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  action_type: "sidebar_toggle",
                                  action_value: e.target.value || null,
                                })
                              }
                              placeholder="Opsional, biasanya kosong"
                              autoComplete="off"
                              spellCheck={false}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={saveItem}
                        className="jarvis-form-save-cta mt-auto flex w-full shrink-0 items-center justify-center gap-2 rounded-md py-3 text-sm font-bold uppercase tracking-wide transition-colors sm:py-3.5"
                      >
                        <Save
                          className="h-4 w-4 shrink-0"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {isOpen && <div className="jarvis-fab-menu-bridge" aria-hidden />}

        <button
          ref={fabButtonRef}
          type="button"
          onClick={() => {
            if (isOpen) {
              closePanel();
            } else {
              allowProximityOpenRef.current = true;
              setIsOpen(true);
            }
          }}
          className={cn(
            "arc-reactor-container focus:outline-none relative flex-shrink-0",
            isOpen && "arc-reactor-container--open scale-110",
          )}
          aria-label="Toggle Jarvis Menu"
        >
          <div className="ring-outer orbit-ring" />
          <div className="ring-inner orbit-ring" />
          <div className="arc-reactor-core" />
          {isOpen && (
            <div className="absolute z-10 text-white" aria-hidden>
              <X className="w-4 h-4" />
            </div>
          )}
        </button>
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleteSubmitting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent
          overlayClassName={UI_LAYERS.dialogOverlayTop}
          className={cn(
            UI_LAYERS.dialogContentTop,
            "max-w-md overflow-hidden border-cyan-500/40 bg-[#050d16f0] p-0 shadow-2xl shadow-black/50 ring-1 ring-cyan-500/15",
          )}
        >
          <div className="border-b border-cyan-500/15 bg-gradient-to-b from-cyan-500/[0.07] to-transparent px-6 pt-6 pb-2">
            <div className="flex items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.12)]"
                aria-hidden
              >
                <Trash2 className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 pt-0.5">
                <AlertDialogTitle
                  className={cn(
                    "jarvis-title text-left !text-cyan-100 !text-base font-bold tracking-[0.18em]",
                  )}
                >
                  Hapus item menu
                </AlertDialogTitle>
                <p
                  className="mt-1.5 text-left text-sm font-mono text-cyan-200/85 truncate"
                  title={pendingDelete?.label}
                >
                  {pendingDelete?.label ?? ""}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <AlertDialogDescription className="text-left text-sm leading-relaxed text-zinc-400">
              Item ini akan dihapus permanen dari menu unit saat ini. Tindakan
              ini tidak dapat dibatalkan.
            </AlertDialogDescription>

            <AlertDialogFooter className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={deleteSubmitting}
                onClick={() => setPendingDelete(null)}
                className="w-full border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-50 sm:w-auto"
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={deleteSubmitting}
                onClick={runConfirmedDelete}
                className="w-full border border-rose-400/40 bg-rose-900/40 text-rose-50 hover:bg-rose-800/55 sm:w-auto"
              >
                {deleteSubmitting ? "Menghapus…" : "Hapus permanen"}
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
