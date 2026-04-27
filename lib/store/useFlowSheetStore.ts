import { create } from 'zustand';

export type Resolution = '1m' | '15m' | '1h';

interface Parameter {
  id: string;
  name: string;
  unit?: string;
  color?: string;
}

interface ParameterGroup {
  id: string;
  name: string;
  parameters: Parameter[];
}

interface FlowSheetState {
  resolution: Resolution;
  setResolution: (res: Resolution) => void;
  
  // Dynamic Groups & Parameters
  groups: ParameterGroup[];
  addParameter: (groupId: string, name: string, unit?: string) => void;
  updateParameter: (parameterId: string, name: string, unit?: string) => void;
  
  // Data structure: parameterId -> { timestamp: value }
  // timestamp is stored as ISO string or unix minute-aligned
  data: Record<string, Record<string, string | number>>;
  
  updateData: (parameterId: string, timestamp: string, value: string | number) => void;

  /** Ganti seluruh peta data (ganti pasien / muat dari server). */
  replaceData: (data: Record<string, Record<string, string | number>>) => void;
  
  // UI States
  expandedGroups: string[];
  toggleGroup: (groupId: string) => void;
  
  currentTime: Date;
  setCurrentTime: (time: Date) => void;
  
  // Unit Isolation
  currentUnitId: string | null;
  resetStore: (unitId: string) => void;
}

const initialGroups: ParameterGroup[] = [
  {
    id: "vitals",
    name: "TANDA VITAL (HEMODINAMIK)",
    parameters: [
      { id: "hr", name: "Heart Rate", unit: "bpm", color: "text-red-400" },
      { id: "bp_s", name: "BP Systolic", unit: "mmHg", color: "text-blue-400" },
      { id: "bp_d", name: "BP Diastolic", unit: "mmHg", color: "text-blue-300" },
      { id: "map", name: "MAP", unit: "mmHg", color: "text-zinc-400" },
      { id: "rr", name: "Resp Rate", unit: "x/mnt", color: "text-emerald-400" },
      { id: "spo2", name: "SpO2", unit: "%", color: "text-cyan-400" },
      { id: "temp", name: "Suhu", unit: "°C", color: "text-orange-400" },
    ],
  },
  // ... rest of groups (shortened for clarity in initialization)
];

export const useFlowSheetStore = create<FlowSheetState>((set) => ({
  resolution: '1h',
  setResolution: (res) => set({ resolution: res }),
  
  groups: [
    {
      id: "vitals",
      name: "TANDA VITAL (HEMODINAMIK)",
      parameters: [
        { id: "hr", name: "Heart Rate", unit: "bpm", color: "text-red-400" },
        { id: "bp_s", name: "BP Systolic", unit: "mmHg", color: "text-blue-400" },
        { id: "bp_d", name: "BP Diastolic", unit: "mmHg", color: "text-blue-300" },
        { id: "map", name: "MAP", unit: "mmHg", color: "text-zinc-400" },
        { id: "rr", name: "Resp Rate", unit: "x/mnt", color: "text-emerald-400" },
        { id: "spo2", name: "SpO2", unit: "%", color: "text-cyan-400" },
        { id: "temp", name: "Suhu", unit: "°C", color: "text-orange-400" },
      ],
    },
    {
      id: "resp",
      name: "RESPIRASI / VENTILATOR",
      parameters: [
        { id: "vent_mode", name: "Mode Vent" },
        { id: "fio2", name: "FiO2", unit: "%" },
        { id: "peep", name: "PEEP", unit: "cmH2O" },
        { id: "tv", name: "Tidal Volume", unit: "ml" },
      ],
    },
    {
      id: "intake",
      name: "INTAKE CAIRAN",
      parameters: [
        { id: "infus_1", name: "Infus RL", unit: "ml/jam" },
        { id: "infus_2", name: "Infus NaCl", unit: "ml/jam" },
        { id: "syring_1", name: "Norepinephrine", unit: "mcg/kg/mnt" },
        { id: "enteral", name: "Makan/Susu", unit: "ml" },
      ],
    },
    {
      id: "output",
      name: "OUTPUT CAIRAN",
      parameters: [
        { id: "urine", name: "Urine Output", unit: "ml" },
        { id: "ngt", name: "NGT", unit: "ml" },
        { id: "drain", name: "Drain", unit: "ml" },
        { id: "iwl", name: "IWL", unit: "ml" },
      ],
    },
    {
      id: "balance",
      name: "BALANCE CAIRAN",
      parameters: [
        { id: "balance_hr", name: "Balance/Jam", unit: "ml", color: "text-orange-400" },
        { id: "balance_cum", name: "Balance Kumulatif", unit: "ml", color: "text-orange-500" },
      ],
    },
    {
      id: "meds-inj",
      name: "PEMBERIAN OBAT INJEKSI",
      parameters: []
    },
    {
      id: "meds-oral",
      name: "PEMBERIAN OBAT ORAL",
      parameters: []
    },
    {
      id: "invasive",
      name: "CATATAN ALAT INVASIF & INOS",
      parameters: [
        { id: "infus-1", name: "INFUS 1", unit: "Hari ke =" },
        { id: "infus-2", name: "INFUS 2", unit: "Hari ke =" },
        { id: "dc", name: "DC", unit: "Hari ke =" },
        { id: "ngt-dev", name: "NGT", unit: "Hari ke =" },
        { id: "drain-cvp", name: "DRAIN/CVP", unit: "Hari ke =" },
        { id: "et-tt-vent", name: "ET / TT / VENT", unit: "Hari ke =" },
        { id: "plebitis", name: "PLEBITIS", unit: "Ya/Tidak" },
        { id: "iadp", name: "IADP", unit: "Ya/Tidak" },
        { id: "ido", name: "IDO", unit: "Ya/Tidak" },
        { id: "dekubitus", name: "DEKUBITUS", unit: "Ya/Tidak" },
        { id: "isk", name: "ISK", unit: "Ya/Tidak" },
        { id: "vap", name: "VAP", unit: "Ya/Tidak" },
      ]
    },
    {
      id: "monitoring",
      name: "MONITORING & PERAWATAN",
      parameters: [
        { id: "restrain", name: "MONITOR RESTRAIN", unit: "" },
        { id: "kebersihan", name: "BANTUAN KEBERSIHAN DIRI", unit: "" },
        { id: "luka", name: "RAWAT LUKA", unit: "" },
      ]
    },
  ],

  addParameter: (groupId, name, unit) => set((state) => ({
    groups: state.groups.map(g => g.id === groupId ? {
      ...g,
      parameters: [...g.parameters, { id: `custom_${Date.now()}`, name, unit }]
    } : g)
  })),

  updateParameter: (parameterId, name, unit) => set((state) => ({
    groups: state.groups.map(g => ({
      ...g,
      parameters: g.parameters.map(p => p.id === parameterId ? { ...p, name, unit } : p)
    }))
  })),

  data: {},
  
  updateData: (parameterId, timestamp, value) => set((state) => {
    const newData = { ...state.data };
    if (!newData[parameterId]) newData[parameterId] = {};
    newData[parameterId][timestamp] = value;
    return { data: newData };
  }),

  replaceData: (data) => set({ data: JSON.parse(JSON.stringify(data)) as typeof data }),
  
  expandedGroups: ['vitals'], 
  toggleGroup: (groupId) => set((state) => ({
    expandedGroups: state.expandedGroups.includes(groupId)
      ? state.expandedGroups.filter(id => id !== groupId)
      : [...state.expandedGroups, groupId]
  })),
  
  currentTime: new Date(),
  setCurrentTime: (time) => set({ currentTime: time }),

  // Unit Isolation Logic
  currentUnitId: null,
  resetStore: (unitId) => set({
    currentUnitId: unitId,
    data: {},
    expandedGroups: ['vitals'],
    currentTime: new Date()
  }),
}));
