"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import {
  House,
  Box,
  People,
  Activity,
  Gear,
  ClipboardData,
  Bell,
  PersonBadge,
  PersonLinesFill,
  PersonWorkspace,
} from "react-bootstrap-icons"
import { useState } from "react"
import { useRoom } from "@/app/contexts/RoomContext"

export default function Sidebar() {
  const pathname = usePathname()
  const params = useParams()
  const roomSlug = params?.room as string
  
  let room: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    room = useRoom()
  } catch (e) {
    // Not in a room context
  }

  const primaryColor = room?.branding?.primaryColor || "#0d6efd"
  const unitName = room?.branding?.displayName || "IDIK-App"

  // state untuk submenu
  const [openTeam, setOpenTeam] = useState(false)
  const [openMonitoring, setOpenMonitoring] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)

  // Helper untuk prefixing link dengan slug unit jika ada
  const getLink = (path: string) => {
    if (roomSlug && path.startsWith("/")) {
      return `/${roomSlug}${path}`
    }
    return path
  }

  // Cek apakah link sedang aktif (mensupport unit prefix)
  const isActive = (path: string) => {
    const target = getLink(path)
    return pathname === target
  }

  return (
    <aside
      className="d-flex flex-column bg-light border-end vh-100 p-3"
      style={{ width: "240px" }}
    >
      <div className="mb-4 d-flex align-items-center gap-2">
        <div className="rounded-circle" style={{ width: '12px', height: '12px', backgroundColor: primaryColor }} />
        <h5 className="mb-0 fw-bold" style={{ color: primaryColor }}>{unitName}</h5>
      </div>

      <ul className="nav nav-pills flex-column custom-sidebar-nav">
        {/* Dashboard */}
        <li className="nav-item mb-1">
          <Link
            href={getLink("/dashboard")}
            prefetch={false}
            className={`nav-link d-flex align-items-center gap-2 ${
              isActive("/dashboard") ? "active" : "text-dark"
            }`}
            style={isActive("/dashboard") ? { backgroundColor: primaryColor } : {}}
          >
            <House size={18} /> Dashboard
          </Link>
        </li>

        {/* Patients - Only if unit has flowsheet/patient capabilities */}
        {(!room || room.capabilities?.flowsheet) && (
          <li className="nav-item mb-1">
            <Link
              href={getLink("/patients")}
              prefetch={false}
              className={`nav-link d-flex align-items-center gap-2 ${
                isActive("/patients") ? "active" : "text-dark"
              }`}
              style={isActive("/patients") ? { backgroundColor: primaryColor } : {}}
            >
              <People size={18} /> Patients
            </Link>
          </li>
        )}

        {/* Tim Unit with dynamic label */}
        <li className="nav-item mb-1">
          <button
            onClick={() => setOpenTeam(!openTeam)}
            className="btn nav-link d-flex align-items-center gap-2 w-100 text-start text-dark border-0 shadow-none"
          >
            <People size={18} /> Tim {room?.branding?.displayName.split(' ')[0] || 'Unit'}
          </button>
          {openTeam && (
            <ul className="nav flex-column ms-4 mt-1">
              <li className="nav-item">
                <Link
                  href={getLink("/team/doctors")}
                  prefetch={false}
                  className={`nav-link d-flex align-items-center gap-2 py-1 ${
                    isActive("/team/doctors") ? "text-primary fw-bold" : "text-secondary"
                  }`}
                  style={{ fontSize: "0.85rem" }}
                >
                  <PersonBadge size={16} /> Dokter
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  href={getLink("/team/nurses")}
                  prefetch={false}
                  className={`nav-link d-flex align-items-center gap-2 py-1 ${
                    isActive("/team/nurses") ? "text-primary fw-bold" : "text-secondary"
                  }`}
                  style={{ fontSize: "0.85rem" }}
                >
                  <PersonLinesFill size={16} /> Perawat
                </Link>
              </li>
            </ul>
          )}
        </li>

        {/* Inventory - Global or Unit Specific? (Assuming Unit for now) */}
        <li className="nav-item mb-1">
          <Link
            href={getLink("/inventory")}
            prefetch={false}
            className={`nav-link d-flex align-items-center gap-2 ${
              isActive("/inventory") ? "active" : "text-dark"
            }`}
            style={isActive("/inventory") ? { backgroundColor: primaryColor } : {}}
          >
            <Box size={18} /> Inventory
          </Link>
        </li>

        {/* Monitoring - Only if enabled */}
        {(!room || room.capabilities?.monitoring) && (
          <li className="nav-item mb-1">
            <button
              onClick={() => setOpenMonitoring(!openMonitoring)}
              className="btn nav-link d-flex align-items-center gap-2 w-100 text-start text-dark border-0 shadow-none"
            >
              <Activity size={18} /> Monitoring
            </button>
            {openMonitoring && (
              <ul className="nav flex-column ms-4 mt-1">
                <li className="nav-item">
                  <Link href={getLink("/monitoring/active")} prefetch={false} className="nav-link text-secondary py-1" style={{ fontSize: "0.85rem" }}>
                    Live Status
                  </Link>
                </li>
              </ul>
            )}
          </li>
        )}

        <hr className="my-3 text-muted opacity-25" />

        {/* Settings */}
        <li className="nav-item mb-1">
          <button
            onClick={() => setOpenSettings(!openSettings)}
            className="btn nav-link d-flex align-items-center gap-2 w-100 text-start text-dark border-0 shadow-none"
          >
            <Gear size={18} /> Settings
          </button>
          {openSettings && (
            <ul className="nav flex-column ms-4 mt-1">
              <li className="nav-item">
                <Link href={getLink("/settings/unit")} prefetch={false} className="nav-link text-secondary py-1" style={{ fontSize: "0.85rem" }}>
                  Unit Config
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/settings/logs" prefetch={false} className="nav-link text-secondary py-1" style={{ fontSize: "0.85rem" }}>
                  System Logs
                </Link>
              </li>
            </ul>
          )}
        </li>
      </ul>
      
      <style jsx>{`
        .custom-sidebar-nav .nav-link {
          transition: all 0.2s;
          border-radius: 8px;
        }
        .custom-sidebar-nav .nav-link:hover {
          background-color: rgba(0,0,0,0.05);
        }
        .custom-sidebar-nav .nav-link.active {
          color: white !important;
        }
      `}</style>
    </aside>
  )
}
