"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function NotificationRealtime() {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const channel = supabase
      .channel("notif-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setMessages((prev) => [
            `${payload.new.title}: ${payload.new.message}`,
            ...prev,
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <ul className="dropdown-menu dropdown-menu-end shadow">
      {messages.length === 0 ? (
        <li><span className="dropdown-item text-muted">Belum ada notifikasi</span></li>
      ) : (
        messages.map((msg, i) => (
          <li key={i}><span className="dropdown-item">{msg}</span></li>
        ))
      )}
    </ul>
  )
}
