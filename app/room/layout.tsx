import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ShareWeb",
};

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          ← Beranda
        </Link>
      </div>
      {children}
    </div>
  );
}
