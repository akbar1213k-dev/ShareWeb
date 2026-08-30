import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShareWeb - Kirim File Antar Perangkat",
  description:
    "Kirim dan terima file antar perangkat dengan mudah menggunakan Google Drive.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
