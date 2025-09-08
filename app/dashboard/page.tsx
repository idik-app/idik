import Topbar from "@/components/Topbar"
import Sidebar from "@/components/Sidebar"
import DashboardContent from "@/components/DashboardContent"
import BottomNav from "@/components/BottomNav"

export default function DashboardPage() {
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Topbar />
        <main className="p-3">
          <DashboardContent />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
