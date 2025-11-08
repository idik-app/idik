"use client";
import { ReactNode, useState } from "react";

export function Tooltip({
  children,
  text,
}: {
  children: ReactNode;
  text: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full mb-2 w-max px-2 py-1 text-xs text-gray-100 bg-black/80 rounded-md shadow-lg z-50">
          {text}
        </div>
      )}
    </div>
  );
}
