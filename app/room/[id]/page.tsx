import { prisma } from "@/lib/db";
import FileListWrapper from "@/components/FileListWrapper";
import RoomShareInfo from "@/components/RoomShareInfo";
import RoomActions from "@/components/RoomActions";
import EditRoomName from "@/components/EditRoomName";
import { formatBytes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | undefined };
}) {
  const room = await prisma.room.findUnique({
    where: { id: params.id },
    select: { id: true, code: true, status: true, name: true },
  });

  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-4 text-5xl">🔍</div>
        <h1 className="text-2xl font-bold">Room tidak ditemukan</h1>
        <p className="mt-2 text-slate-400">
          Cek kembali link atau kode room Anda.
        </p>
        <a
          href="/"
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
        >
          Kembali ke Beranda
        </a>
      </div>
    );
  }

  const files = await prisma.file.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      size: true,
      mimeType: true,
      createdAt: true,
    },
  });

  const totalSize = files.reduce((a, f) => a + f.size, 0);

  const initialFiles = files.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  const isActive = room.status === "ACTIVE";

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <EditRoomName roomId={room.id} initialName={room.name} />
            <h2 className="mt-1 text-sm text-slate-400">
              <span className="font-mono font-semibold text-slate-300">
                {room.code}
              </span>{" "}
              · {files.length} file · {formatBytes(totalSize)} total
            </h2>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              isActive
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {isActive ? "Aktif" : "Nonaktif"}
          </span>
        </div>
        {!isActive && (
          <p className="mt-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            Room ini nonaktif — pengguna lain tidak dapat mengaksesnya.
          </p>
        )}
      </div>

      <RoomActions roomId={room.id} initialStatus={room.status} />

      <RoomShareInfo
        roomId={room.id}
        code={room.code}
        initialPassword={searchParams.pw}
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold">File Room</h2>
        <FileListWrapper roomId={room.id} initialFiles={initialFiles} />
      </section>
    </div>
  );
}
