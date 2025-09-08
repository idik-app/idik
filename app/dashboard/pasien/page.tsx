import Breadcrumbs from "@/components/Breadcrumbs"


export default function PasienPage() {
  const dataDummy = [
    { noRM: "12345", nama: "Budi Santoso", dokter: "dr. Samuel", tindakan: "PCI" },
    { noRM: "67890", nama: "Siti Aminah", dokter: "dr. Faishal", tindakan: "Stent DES" },
  ]

  return (
    <div className="p-3">
      <Breadcrumbs />
      <h4 className="fw-bold mb-3">Manajemen Pasien</h4>

      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>No. RM</th>
            <th>Nama Pasien</th>
            <th>Dokter</th>
            <th>Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {dataDummy.map((p) => (
            <tr key={p.noRM}>
              <td>{p.noRM}</td>
              <td>{p.nama}</td>
              <td>{p.dokter}</td>
              <td>{p.tindakan}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
// di PasienPage (bawah tabel)
import QRCode from "react-qr-code"

<QRCode value="https://idik-app.vercel.app/dashboard/pasien/12345" size={80} />
