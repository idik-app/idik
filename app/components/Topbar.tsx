"use client"

import { useState } from "react"
import { Bell, Moon, Sun, PersonCircle } from "react-bootstrap-icons"
import NotificationRealtime from "@/components/NotificationRealtime"
export default function Topbar() {
  const [dark, setDark] = useState(false)

  return (
    <header className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-white shadow-sm">
      {/* Judul Halaman */}
      <h5 className="fw-bold mb-0">Dashboard</h5>

      {/* Aksi Kanan */}
      <div className="d-flex align-items-center gap-3">
        {/* Notifikasi */}
        <div className="dropdown">
          <button
            className="btn position-relative"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            
            <Bell size={20} />
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              3
            </span>
          </button>
         <NotificationRealtime />
        </div>

        {/* Theme Switcher */}
        <button
          className="btn"
          onClick={() => setDark(!dark)}
          title="Ganti tema"
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Profil */}
        <div className="dropdown">
          <button
            className="btn dropdown-toggle d-flex align-items-center"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            
            <PersonCircle size={20} className="me-2" /> Admin
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow">
            <li><a className="dropdown-item" href="#">Profil</a></li>
            <li><a className="dropdown-item" href="#">Logout</a></li>
          </ul>
        </div>
      </div>
    </header>
  )
}
