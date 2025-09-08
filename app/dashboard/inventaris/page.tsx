import Breadcrumbs from "@/components/Breadcrumbs"


export default function InventarisPage() {
  const dataDummy = [
    { nama: "Stent DES 3.0x18", lot: "ST123", stok: 5, ed: "2025-12-01" },
    { nama: "Balloon 2.5x20", lot: "BL456", stok: 2, ed: "2024-10-15" },
  ]

  return (
    <div className="p-3">
      <Breadcrumbs />
      <h4 className="fw-bold mb-3">Inventaris Alkes</h4>

      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Nama Barang</th>
            <th>LOT</th>
            <th>Stok</th>
            <th>ED</th>
          </tr>
        </thead>
        <tbody>
          {dataDummy.map((i) => (
            <tr key={i.lot} className={new Date(i.ed) <= new Date() ? "table-danger" : ""}>
              <td>{i.nama}</td>
              <td>{i.lot}</td>
              <td>{i.stok}</td>
              <td>{i.ed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
