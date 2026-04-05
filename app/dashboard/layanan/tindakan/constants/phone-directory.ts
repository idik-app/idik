export interface HospitalUnit {
  id: string;
  unit: string;
  ext: string;
  location: string;
  floor?: string;
  isPinned?: boolean;
}

export const hospitalDirectory: HospitalUnit[] = [
  { id: "1", unit: "OPERATOR", ext: "0/100", location: "LT. 1 & Basement", floor: "LT 1" },
  { id: "2", unit: "Cathlab", ext: "640", location: "LT. 6", floor: "LT 6" },
  { id: "3", unit: "ICCU", ext: "452", location: "LT. 4", floor: "LT 4" },
  { id: "4", unit: "IGD 24 JAM", ext: "114", location: "LT. 1", floor: "LT 1" },
  { id: "5", unit: "Poli Jantung", ext: "210", location: "LT. 2", floor: "LT 2" },
  { id: "6", unit: "Radiologi", ext: "305", location: "LT. 3", floor: "LT 3" },
  { id: "7", unit: "Laboratorium", ext: "312", location: "LT. 3", floor: "LT 3" },
  { id: "8", unit: "VK (Bersalin)", ext: "401", location: "LT. 4", floor: "LT 4" },
  { id: "9", unit: "OK (Kamar Operasi)", ext: "505", location: "LT. 5", floor: "LT 5" },
  { id: "10", unit: "RPI (Rawat Peninggian Intensif)", ext: "444", location: "LT. 4", floor: "LT 4" },
  { id: "11", unit: "Admission/Pendaftaran", ext: "101", location: "LT. 1", floor: "LT 1" },
  { id: "12", unit: "Farmasi Rawat Inap", ext: "120", location: "LT. 1", floor: "LT 1" },
  { id: "13", unit: "Manajemen", ext: "701", location: "LT. 7", floor: "LT 7" },
  { id: "14", unit: "IT Helpdesk", ext: "777", location: "LT. 7", floor: "LT 7" },
  { id: "15", unit: "Keamanan (Satpam)", ext: "110", location: "Gerbang Depan", floor: "LT 1" },
  { id: "16", unit: "Gizi", ext: "205", location: "LT. 2", floor: "LT 2" },
];
