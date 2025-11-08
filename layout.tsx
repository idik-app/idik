import { ReactNode } from "react";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: ReactNode; // ✅ tipe eksplisit
}) {
  return (
    <html lang="id">
      <body>
        {children}
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
