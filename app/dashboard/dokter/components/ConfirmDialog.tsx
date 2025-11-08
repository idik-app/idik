"use client";
export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-gray-900 border border-cyan-700/50 rounded-xl p-6 text-center shadow-xl text-gray-200">
        <p className="mb-5 text-cyan-300">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-md bg-red-600/70 hover:bg-red-700 text-white"
          >
            Hapus
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
