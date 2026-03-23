"use client"

import { PersonAdd, PlusCircle } from "react-bootstrap-icons"

export default function QuickAction() {
  return (
    <div className="d-flex flex-wrap gap-2 mb-4">
      <button className="btn btn-primary d-flex align-items-center gap-2">
        <PersonAdd size={20} />
        Tambah Pasien
      </button>
      <button className="btn btn-success d-flex align-items-center gap-2">
        <PlusCircle size={20} />
        Tambah Inventaris
      </button>
    </div>
  )
}
