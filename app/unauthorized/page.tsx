import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center text-red-400 bg-black/90">
      <div>
        <h1 className="text-3xl font-bold mb-2">🚫 Akses Ditolak</h1>
        <p className="text-gray-400 mb-6">
          Halaman ini hanya dapat diakses oleh <b>Administrator Cathlab</b>.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
