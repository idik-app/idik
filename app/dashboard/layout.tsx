// ⚙️ app/dashboard/layout.tsx
// Jangan beri "use client" di sini
import { ReactNode } from "react";
import { LayoutContainer } from "@/components/layout";

/**
 * 🧠 Dashboard Layout – Server Wrapper (Fix React $$typeof)
 *   - Tidak memiliki "use client"
 *   - Tidak mendefinisikan ulang context provider global
 *   - Semua interaksi client dijalankan di dalam LayoutContainer
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <LayoutContainer />;
}
