import { motion } from "framer-motion";
import { TindakanRow } from "../types";

interface Props {
  row: TindakanRow;
  i: number;
  onEdit: (i: number, field: keyof TindakanRow, value: string) => void;
  editing: { row: number; field: string } | null;
  setEditing: (v: { row: number; field: string } | null) => void;
  value: string;
  setValue: (v: string) => void;
}

export default function TableRowEditable({
  row,
  i,
  onEdit,
  editing,
  setEditing,
  value,
  setValue,
}: Props) {
  const renderCell = (field: keyof TindakanRow) => {
    const isEditing = editing?.row === i && editing?.field === field;
    const cellValue = isEditing ? value : (row[field] as string);

    return (
      <div
        onClick={() => {
          if (field === "id") return;
          setEditing({ row: i, field });
          setValue(row[field] as string);
        }}
        className={`px-2 py-1 rounded-md transition-all duration-200 ${
          isEditing
            ? "bg-cyan-900/60 border border-cyan-400 text-cyan-200"
            : "hover:bg-cyan-950/40 cursor-pointer"
        }`}
      >
        {isEditing ? (
          <input
            autoFocus
            value={cellValue}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              onEdit(i, field, value);
              setEditing(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onEdit(i, field, value);
                setEditing(null);
              } else if (e.key === "Escape") {
                setEditing(null);
              }
            }}
            className="w-full bg-transparent outline-none text-cyan-100"
          />
        ) : (
          <span>{cellValue}</span>
        )}
      </div>
    );
  };

  return (
    <motion.div
      key={row.id ?? i}
      className={`grid grid-cols-5 gap-4 px-6 py-2 items-center ${
        row.status === "Selesai"
          ? "text-cyan-300"
          : row.status === "Proses"
          ? "text-amber-300"
          : row.status === "Menunggu"
          ? "text-gray-400"
          : "text-white"
      }`}
    >
      {renderCell("tanggal")}
      {renderCell("nama")}
      {renderCell("dokter")}
      {renderCell("tindakan")}
      {renderCell("status")}
    </motion.div>
  );
}
