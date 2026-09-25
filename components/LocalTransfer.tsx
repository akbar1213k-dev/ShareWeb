"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocalPeer, type TransferTask } from "@/lib/webrtc";
import { formatBytes } from "@/lib/format";

type Device = {
  id: string;
  name: string;
  host: string;
  port: number;
  addresses: string[];
  txt: Record<string, string>;
};

type Props = {
  roomId: string;
};

const POLL_MS = 1500;

export default function LocalTransfer({ roomId }: Props) {
  const [selfId, setSelfId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [manualIp, setManualIp] = useState("");
  const [manualId, setManualId] = useState("");
  const [peer, setPeer] = useState<LocalPeer | null>(null);
  const [connState, setConnState] = useState("new");
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [tasks, setTasks] = useState<Record<string, TransferTask>>({});
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const peerRef = useRef<LocalPeer | null>(null);
  const selfIdRef = useRef("");
  const targetRef = useRef<{ id: string; ip: string } | null>(null);

  const updateTask = useCallback((task: TransferTask) => {
    setTasks((prev) => {
      const next = { ...prev };
      next[task.id] = task;
      return next;
    });
  }, []);

  const syncSelfId = useCallback(async () => {
    const res = await fetch("/api/local/identity");
    const data = await res.json();
    setSelfId(data.serverId);
    selfIdRef.current = data.serverId;
  }, []);

  useEffect(() => {
    syncSelfId();
  }, [syncSelfId]);

  const scan = useCallback(async () => {
    setScanning(true);
    setError("");
    try {
      const res = await fetch("/api/local/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfName: "ShareWeb", timeout: 4000 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memindai.");
      setDevices(data.devices || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  }, []);

  // Polling for incoming signals & handshake completion
  useEffect(() => {
    if (!selfId) return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/local/signal/poll?roomId=${encodeURIComponent(roomId)}&participant=${encodeURIComponent(selfId)}`
        );
        const data = await res.json();
        const signals = data.signals || [];
        const p = peerRef.current;
        for (const sig of signals) {
          if (!cancelled && p) {
            await p.handleSignal(sig);
          } else if (!cancelled && !p) {
            // Incoming offer but no peer yet - create a receiving peer
            if (sig.type === "offer" && sig.sender) {
              createPeer(sig.sender);
            }
          }
        }
      } catch {}
    };

    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfId, roomId]);

  useEffect(() => {
    return () => {
      peerRef.current?.close();
    };
  }, []);

  const pushSignal = useCallback(
    async (target: string, message: any) => {
      await fetch("/api/local/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          participant: selfIdRef.current,
          target,
          message,
        }),
      });
    },
    [roomId]
  );

  const createPeer = useCallback(
    (incomingSenderId?: string) => {
      peerRef.current?.close();
      const targetServerId = incomingSenderId || targetRef.current?.id || "";
      const p = new LocalPeer({
        roomId,
        selfId: selfIdRef.current,
        onSignal: (_, message) => {
          pushSignal(targetServerId, { ...message, senderId: selfIdRef.current });
        },
        onTaskUpdate: updateTask,
        onConnectionState: (state) => {
          setConnState(state);
          if (state === "disconnected" || state === "failed") {
            setPeer(null);
            peerRef.current = null;
          }
        },
      });
      peerRef.current = p;
      setPeer(p);
      return p;
    },
    [roomId, pushSignal, updateTask]
  );

  const connectTo = useCallback(
    (device: Device) => {
      const targetId = device.txt?.serverId || device.id || "";
      targetRef.current = { id: targetId, ip: device.addresses[0] || device.host };
      const p = createPeer();
      p.createChannel();
      setSelectedTarget(device.name);
      setError("");

      p.pc
        .createOffer()
        .then((offer) => p.pc.setLocalDescription(offer))
        .then(() => {
          pushSignal(targetId, {
            type: "offer",
            data: p.pc.localDescription,
            senderId: selfIdRef.current,
          });
        })
        .catch((e: any) => setError(e.message));
    },
    [createPeer, pushSignal]
  );

  const connectManual = useCallback(() => {
    if (!manualIp.trim() && !manualId.trim()) {
      setError("Masukkan alamat IP atau ID perangkat tujuan.");
      return;
    }
    const targetId = manualId.trim() || manualIp.trim();
    const pseudo: Device = {
      id: manualIp.trim() || targetId,
      name: manualId.trim() ? `Perangkat ${targetId.slice(0, 8)}` : manualIp.trim(),
      host: manualIp.trim(),
      port: 0,
      addresses: manualIp.trim() ? [manualIp.trim()] : [],
      txt: manualId.trim() ? { serverId: targetId } : {},
    };
    connectTo(pseudo);
  }, [manualIp, manualId, connectTo]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const p = peerRef.current;
      if (!p || connState !== "connected") {
        setError("Belum terhubung ke perangkat tujuan.");
        return;
      }
      p.queueFiles(Array.from(files));
    },
    [connState]
  );

  const isConnected = connState === "connected";
  const taskList = Object.values(tasks).sort(
    (a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0)
  );

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Transfer Lokal (WebRTC)
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isConnected
              ? "bg-emerald-500/20 text-emerald-400"
              : connState === "connecting"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          {isConnected ? "Terhubung" : connState === "connecting" ? "Menghubungkan..." : "Belum terhubung"}
        </span>
      </div>

      <p className="text-xs text-slate-500">
        ID Perangkat Anda:{" "}
        <span className="font-mono text-slate-300">{selfId}</span>
      </p>

      {error && (
        <div className="mb-3 mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Device discovery */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">
            Perangkat di Jaringan
          </h3>
          <button
            onClick={scan}
            disabled={scanning}
            className="rounded-lg border border-slate-600 px-3 py-1 text-xs transition hover:border-emerald-500 disabled:opacity-50"
          >
            {scanning ? "Memindai..." : "Pindai Jaringan"}
          </button>
        </div>
        {devices.length === 0 && !scanning ? (
          <p className="text-xs text-slate-500">
            Tidak ada perangkat ditemukan. Jalankan ShareWeb di perangkat lain
            lalu pindai lagi, atau masukkan IP/ID secara manual.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {d.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {d.addresses[0] || d.host}
                  </p>
                </div>
                <button
                  onClick={() => connectTo(d)}
                  disabled={isConnected}
                  className="ml-2 shrink-0 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  Hubungkan
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Manual input */}
      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
        <h3 className="mb-2 text-sm font-medium text-slate-300">
          Hubungkan Manual (IP / ID Perangkat)
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            placeholder="192.168.1.10"
            className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="ID perangkat tujuan"
            className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={connectManual}
            disabled={isConnected}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm transition hover:border-emerald-500 disabled:opacity-50"
          >
            Hubungkan
          </button>
        </div>
      </div>

      {/* Connected file drop area */}
      {isConnected && (
        <div className="mt-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
              dragOver
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-slate-600 hover:border-emerald-500/60"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="mb-1 text-3xl">📁</div>
            <p className="font-medium">
              Kirim file ke {selectedTarget || "perangkat tujuan"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Klik atau seret file - transfer langsung antar perangkat (P2P)
            </p>
          </div>

          {taskList.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {taskList.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {t.direction === "send" ? "⬆️" : "⬇️"} {t.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatBytes(t.size)} · {t.progress}%
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        t.status === "done"
                          ? "text-emerald-400"
                          : t.status === "error"
                          ? "text-red-400"
                          : "text-slate-400"
                      }`}
                    >
                      {t.status === "done"
                        ? "Selesai"
                        : t.status === "error"
                        ? t.error || "Gagal"
                        : "Mengirim..."}
                    </span>
                  </div>
                  {t.status === "transferring" && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
