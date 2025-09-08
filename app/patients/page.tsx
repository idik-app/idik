"use client"

import { useState } from "react"
import { Funnel, PersonAdd } from "react-bootstrap-icons"

export default function PatientsPage() {
  const [filter, setFilter] = useState("")

  const patients = [
    { id: 1, name: "Budi Santoso", doctor: "dr. Samuel", date: "2025-09-08" },
    { id: 2, name: "Siti Aminah", doctor: "dr. Faishal", date: "2025-09-07" },
  ]

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="p-3">
      <h4 className="fw-bold mb-3">Daftar Pasien</h4>

      {/* Filter */}
      <div className="d-flex gap-2 mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Cari pasien..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className="btn btn-primary d-flex align-items-center gap-2">
          <PersonAdd size={20} /> Tambah Pasien
        </button>
      </div>

      {/* Tabel */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Nama Pasien</th>
              <th>Dokter</th>
              <th>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.doctor}</td>
                <td>{p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
