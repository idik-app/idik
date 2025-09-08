"use client"

import ChartCard from "@/components/ChartCard"
import QuickAction from "@/components/QuickAction"

export default function DashboardContent() {
  return (
    <div>
      {/* Ringkasan */}
      <div className="row g-3 mb-4">
        {[
          { title: "Total Pasien", value: 128, color: "primary", icon: "bi-people" },
          { title: "Inventaris", value: 542, color: "success", icon: "bi-box" },
          { title: "Prosedur Hari Ini", value: 12, color: "warning", icon: "bi-activity" },
          { title: "Alarm Expired", value: 4, color: "danger", icon: "bi-exclamation-triangle" },
        ].map((item, i) => (
          <div className="col-6 col-lg-3" key={i}>
            <div className="card shadow-sm p-3 text-center">
              <i
                className={`bi ${item.icon} text-${item.color}`}
                style={{ fontSize: "20px" }}
              ></i>
              <h6 className="mt-2" style={{ fontSize: "0.9rem" }}>
                {item.title}
              </h6>
              <h4 className="fw-bold">{item.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action */}
        <QuickAction />
        
      {/* Menu Utama */}
      <h5 className="mb-3">Menu Utama</h5>
      <div className="row g-4">
        {[
          { title: "Pasien", icon: "bi-people", color: "primary" },
          { title: "Inventaris", icon: "bi-box", color: "success" },
          { title: "Monitoring", icon: "bi-activity", color: "warning" },
          { title: "Pengaturan", icon: "bi-gear", color: "secondary" },
        ].map((menu, i) => (
          <div className="col-12 col-sm-6 col-lg-3" key={i}>
            <div
              className="card shadow-sm text-center p-4 border-0 h-100 hover-card"
              style={{ cursor: "pointer" }}
            >
              <i
                className={`bi ${menu.icon} text-${menu.color}`}
                style={{ fontSize: "20px" }}
              ></i>
              <h6 className="mt-3 fw-semibold" style={{ fontSize: "0.95rem" }}>
                {menu.title}
              </h6>
            </div>
          </div>
        ))}
      </div>

      {/* Grafik */}
      <ChartCard />

      <style jsx>{`
        .hover-card {
          transition: all 0.2s ease-in-out;
        }
        .hover-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}
