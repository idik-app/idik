export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center text-red-400 bg-black/90">
      <div>
        <h1 className="text-3xl font-bold mb-2">🚫 Akses Ditolak</h1>
        <p className="text-gray-400">
          Halaman ini hanya dapat diakses oleh <b>Administrator Cathlab</b>.
        </p>
      </div>
    </div>
  );
}
