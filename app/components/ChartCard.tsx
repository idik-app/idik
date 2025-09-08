"use client"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"

// ✅ WAJIB: daftar semua komponen yang dipakai chart
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function ChartCard() {
  const data = {
    labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
    datasets: [
      {
        label: "Tindakan",
        data: [12, 15, 8, 18, 20, 10, 5],
        borderColor: "#0d6efd",
        backgroundColor: "rgba(13, 110, 253, 0.2)",
        tension: 0.3,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
  }

  return (
    <div className="card shadow-sm p-3 mt-4">
      <h6 className="fw-bold mb-3">Grafik Tindakan Mingguan</h6>
      <Line data={data} options={options} />
    </div>
  )
}
