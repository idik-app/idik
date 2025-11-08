"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePasien } from "../pasien/contexts/PasienContext";
import PasienToolbar from "../pasien/components/PasienToolbar";
import PasienTable from "../pasien/components/PasienTable";

// ✅ pastikan file ini adalah .tsx dan punya export default function + props interface
import PasienModalForm, {
  PasienModalFormProps,
} from "../pasien/components/PasienModalForm";

import { Pasien } from "../pasien/types/pasien";

/**
 * 🧠 PasienContent v5.6 – Type Safe & Stable
 * - Clean render tanpa fetch ganda
 * - Modal dikontrol penuh via Context
 */
export default function PasienContent() {
  const { modalMode, selectedPatient, clearSelection } = usePasien();

  const hasModal =
    modalMode === "add" || modalMode === "edit" || modalMode === "view";

  return (
    <div className="space-y-6">
      <PasienToolbar />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PasienTable />
      </motion.div>

      <AnimatePresence>
        {hasModal && (
          <motion.div
            key="pasien-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <PasienModalForm
              mode={modalMode as PasienModalFormProps["mode"]}
              pasien={selectedPatient as Pasien | null}
              onClose={clearSelection}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
