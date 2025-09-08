"use client"

import { useState, useEffect } from "react"
import { Sun, Moon } from "react-bootstrap-icons"

export default function ThemeSwitcher() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.body.setAttribute("data-bs-theme", dark ? "dark" : "light")
  }, [dark])

  return (
    <button
      className="btn btn-sm btn-outline-secondary"
      onClick={() => setDark(!dark)}
    >
      {dark ? <Sun /> : <Moon />}
    </button>
  )
}
