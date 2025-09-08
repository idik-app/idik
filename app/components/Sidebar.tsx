"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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

export default function Sidebar() {
  const pathname = usePathname()

  // state untuk submenu
  const [openTeam, setOpenTeam] = useState(false)
  const [openMonitoring, setOpenMonitoring] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)

  return (
    <aside
      className="d-flex flex-column bg-light border-end vh-100 p-3"
      style={{ width: "240px" }}
    >
      <h5 className="mb-4 fw-bold">IDIK-App</h5>
      <ul className="nav nav-pills flex-column">

        {/* Dashboard */}
        <li className="nav-item mb-2">
          <Link
            href="/dashboard"
            className={`nav-link d-flex align-items-center gap-2 ${
              pathname === "/dashboard" ? "active" : "text-dark"
            }`}
          >
            <House size={20} /> Dashboard
          </Link>
        </li>

        {/* Patients */}
        <li className="nav-item mb-2">
          <Link
            href="/patients"
            className={`nav-link d-flex align-items-center gap-2 ${
              pathname === "/patients" ? "active" : "text-dark"
            }`}
          >
            <People size={20} /> Patients
          </Link>
        </li>

        {/* Tim Cathlab with submenu */}
        <li className="nav-item mb-2">
          <button
            onClick={() => setOpenTeam(!openTeam)}
            className="btn nav-link d-flex align-items-center gap-2 w-100 text-start text-dark"
          >
            <People size={20} /> Tim Cathlab
          </button>
          {openTeam && (
            <ul className="nav flex-column ms-4 mt-1">
              <li className="nav-item">
                <Link
                  href="/team/doctors"
                  className={`nav-link d-flex align-items-center gap-2 py-1 ${
                    pathname === "/team/doctors" ? "active" : "text-secondary"
                  }`}
                  style={{ fontSize: "0.9rem" }}
                >
                  <PersonBadge size={20} /> Dokter
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  href="/team/nurses"
                  className={`nav-link d-flex align-items-center gap-2 py-1 ${
                    pathname === "/team/nurses" ? "active" : "text-secondary"
                  }`}
                  style={{ fontSize: "0.9rem" }}
                >
                  <PersonLinesFill size={20} /> Perawat
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  href="/team/radiographers"
                  className={`nav-link d-flex align-items-center gap-2 py-1 ${
                    pathname === "/team/radiographers" ? "active" : "text-secondary"
                  }`}
                  style={{ fontSize: "0.9rem" }}
                >
                  <PersonWorkspace size={20} /> Radiografer
                </Link>
              </li>
            </ul>
          )}
        </li>

        {/* Inventory */}
        <li className="nav-item mb-2">
          <Link
            href="/inventory"
            className={`nav-link d-flex align-items-center gap-2 ${
              pathname === "/inventory" ? "active" : "text-dark"
            }`}
          >
            <Box size={20} /> Inventory
          </Link>
        </li>

        {/* Distributors */}
        <li className="nav-item mb-2">
          <Link
            href="/distributors"
            className={`nav-link d-flex align-items-center gap-2 ${
              pathname === "/distributors" ? "active" : "text-dark"
            }`}
          >
            🛒 Distributors
          </Link>
        </li>

        {/* Monitoring with submenu */}
        <li className="nav-item mb-2">
          <button
            onClick={() => setOpenMonitoring(!openMonitoring)}
            className="btn nav-link d-flex align-items-center gap-2 w-100 text-start text-dark"
          >
            <Activity size={20} /> Monitoring
          </button>
          {openMonitoring && (
            <ul className="nav flex-column ms-4 mt-1">
              <li className="nav-item">
                <Link href="/monitoring/cathlab1" className="nav-link text-secondary py-1">
                  Cathlab 1
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/monitoring/cathlab2" className="nav-link text-secondary py-1">
                  Cathlab 2
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/monitoring/cathlab3" className="nav-link text-secondary py-1">
                  Cathlab 3
                </Link>
              </li>
            </ul>
          )}
        </li>

        {/* Reports */}
        <li className="nav-item mb-2">
          <Link
            href="/reports"
            className={`nav-link d-flex align-items-center gap-2 ${
              pathname === "/reports" ? "active" : "text-dark"
            }`}
          >
            <ClipboardData size={20} /> Reports
          </Link>
        </li>

        {/* Notifications */}
        <li className="nav-item mb-2">
          <Link
            href="/notifications"
            className={`nav-link d-flex align-items-center gap-2 ${
              pathname === "/notifications" ? "active" : "text-dark"
            }`}
          >
            <Bell size={20} /> Notifications
          </Link>
        </li>

        {/* Settings with submenu */}
        <li className="nav-item mb-2">
          <button
            onClick={() => setOpenSettings(!openSettings)}
            className="btn nav-link d-flex align-items-center gap-2 w-100 text-start text-dark"
          >
            <Gear size={20} /> Settings
          </button>
          {openSettings && (
            <ul className="nav flex-column ms-4 mt-1">
              <li className="nav-item">
                <Link href="/settings/user-management" className="nav-link text-secondary py-1">
                  User Management
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/settings/logs" className="nav-link text-secondary py-1">
                  System Logs
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/settings/integration" className="nav-link text-secondary py-1">
                  Integrasi SIMRS
                </Link>
              </li>
            </ul>
          )}
        </li>
      </ul>
    </aside>
  )
}
