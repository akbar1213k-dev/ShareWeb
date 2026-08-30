import CreateRoom from "@/components/CreateRoom";
import JoinRoom from "@/components/JoinRoom";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-10 px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">ShareWeb 📤</h1>
        <p className="mx-auto mt-4 max-w-md text-slate-400">
          Kirim file antar perangkat secara aman. Buat room, bagikan kode dan
          password, lalu unduh di perangkat lain. File disimpan di Google Drive.
        </p>
      </div>

      <div className="grid w-full gap-6 sm:grid-cols-2">
        <CreateRoom />
        <JoinRoom />
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-3">
        {[
          { icon: "🔐", title: "Aman", desc: "Proteksi dengan password unik per room" },
          { icon: "☁️", title: "Di cloud", desc: "File tersimpan di Google Drive" },
          { icon: "📱", title: "Multi-perangkat", desc: "Akses dari perangkat mana pun" },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 text-center"
          >
            <div className="mb-2 text-3xl">{f.icon}</div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
