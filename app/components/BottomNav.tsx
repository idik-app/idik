"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, Box, People, Activity, Gear } from "react-bootstrap-icons"

export default function BottomNav() {
  const pathname = usePathname()

  const menu = [
    { href: "/dashboard", label: "Home", icon: <House size={20} /> },
    { href: "/inventory", label: "Inventory", icon: <Box size={20} /> },
    { href: "/patients", label: "Patients", icon: <People size={20} /> },
    { href: "/monitoring", label: "Monitoring", icon: <Activity size={20} /> },
    { href: "/settings", label: "Settings", icon: <Gear size={20} /> },
  ]

  return (
    <nav
      className="d-lg-none bg-white border-top shadow-sm position-fixed bottom-0 start-0 end-0"
      style={{ zIndex: 1030 }}
    >
      <ul className="nav justify-content-around py-2 m-0">
        {menu.map((item) => (
          <li key={item.href} className="nav-item">
            <Link
              href={item.href}
              className={`nav-link d-flex flex-column align-items-center ${
                pathname === item.href ? "text-primary fw-semibold" : "text-secondary"
              }`}
              style={{ fontSize: "0.8rem" }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
