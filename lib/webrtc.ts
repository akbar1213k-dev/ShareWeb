export const CHUNK_SIZE = 64 * 1024;

export type TransferTask = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  direction: "send" | "receive";
  progress: number;
  status: "queued" | "transferring" | "done" | "error";
  error?: string;
};

export type SignalHandler = (msg: any) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class LocalPeer {
  roomId: string;
  selfId: string;
  pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private outbox: File[] = [];
  private sending = false;
  onSignal: (target: string, message: any) => void;
  onTaskUpdate: (task: TransferTask) => void;
  onConnectionState: (state: string) => void;
  onReceiveStart?: (meta: FileMeta) => void;

  constructor(opts: {
    roomId: string;
    selfId: string;
    onSignal: (target: string, message: any) => void;
    onTaskUpdate: (task: TransferTask) => void;
    onConnectionState: (state: string) => void;
    onReceiveStart?: (meta: FileMeta) => void;
  }) {
    this.roomId = opts.roomId;
    this.selfId = opts.selfId;
    this.onSignal = opts.onSignal;
    this.onTaskUpdate = opts.onTaskUpdate;
    this.onConnectionState = opts.onConnectionState;
    this.onReceiveStart = opts.onReceiveStart;

    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.onSignal("peer", {
          type: "ice",
          data: e.candidate,
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.onConnectionState(this.pc.connectionState);
    };

    this.pc.ondatachannel = (e) => {
      this.setupDataChannel(e.channel);
    };
  }

  private setupDataChannel(dc: RTCDataChannel) {
    this.dc = dc;
    dc.binaryType = "arraybuffer";
    dc.onopen = () => this.onConnectionState("connected");
    dc.onclose = () => this.onConnectionState("disconnected");
    dc.onerror = () => this.onConnectionState("disconnected");
    dc.onmessage = (e) => this.handleMessage(e.data);
  }

  createChannel() {
    const dc = this.pc.createDataChannel("shareweb-transfer");
    this.setupDataChannel(dc);
    this.dc = dc;
  }

  sendSignal(message: any) {
    this.onSignal("peer", message);
  }

  async handleSignal(message: any) {
    if (message.type === "offer") {
      await this.pc.setRemoteDescription(message.data);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.sendSignal({ type: "answer", data: this.pc.localDescription });
    } else if (message.type === "answer") {
      await this.pc.setRemoteDescription(message.data);
    } else if (message.type === "ice") {
      try {
        await this.pc.addIceCandidate(message.data);
      } catch {}
    }
  }

  queueFiles(files: File[]) {
    this.outbox.push(...files);
    this.trySend();
  }

  private async trySend() {
    if (this.sending) return;
    this.sending = true;
    while (this.outbox.length > 0) {
      const file = this.outbox.shift()!;
      await this.sendFile(file);
    }
    this.sending = false;
  }

  private async sendFile(file: File) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const task: TransferTask = {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      direction: "send",
      progress: 0,
      status: "transferring",
    };
    this.onTaskUpdate(task);

    if (!this.dc || this.dc.readyState !== "open") {
      this.updateTask(id, { status: "error", error: "Koneksi tidak aktif." });
      return;
    }

    const meta: FileMeta = {
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
    };

    await this.sendChunk(JSON.stringify({ type: "meta", meta }));
    await sleep(50);

    const buffer = await file.arrayBuffer();
    let offset = 0;
    while (offset < buffer.byteLength) {
      if (this.dc.readyState !== "open") break;
      const end = Math.min(offset + CHUNK_SIZE, buffer.byteLength);
      const slice = buffer.slice(offset, end);
      const header = JSON.stringify({ type: "chunk", dataOffset: offset, total: buffer.byteLength });
      await this.sendChunk(header);
      this.sendChunk(slice, true);
      offset = end;
      this.updateTask(id, {
        progress: Math.round((offset / buffer.byteLength) * 100),
      });
      await sleep(0);
    }

    await this.sendChunk(JSON.stringify({ type: "done", total: buffer.byteLength }));
    this.updateTask(id, { progress: 100, status: "done" });
  }

  private async sendChunk(payload: string | ArrayBuffer, isBinary = false) {
    if (!this.dc) return;
    if (this.dc.bufferedAmount > 16 * 1024 * 1024) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (this.dc!.bufferedAmount < 8 * 1024 * 1024) resolve();
          else setTimeout(check, 100);
        };
        check();
      });
    }
    if (isBinary) {
      this.dc.send(payload as ArrayBuffer);
    } else {
      this.dc.send(payload as string);
    }
  }

  private updateTask(id: string, patch: Partial<TransferTask>) {
    this.onTaskUpdate({
      id,
      name: "",
      size: 0,
      mimeType: "",
      direction: "send",
      progress: 0,
      status: "transferring",
      ...patch,
    });
  }

  private receiveBuffer = new Map<string, Uint8Array[]>();
  private receiveMeta = new Map<string, { meta: FileMeta; received: number; chunks: Uint8Array[] }>();

  private handleMessage(data: any) {
    if (typeof data === "string") {
      try {
        const msg = JSON.parse(data);
        this.handleControl(msg);
      } catch {}
    } else {
      this.handleChunk(data as ArrayBuffer);
    }
  }

  private currentMeta: FileMeta | null = null;
  private currentChunks: Uint8Array[] = [];
  private currentReceived = 0;
  private currentId = "";

  private handleControl(msg: ControlMessage) {
    if (msg.type === "meta") {
      const meta = msg.meta;
      if (!meta) return;
      this.currentMeta = meta;
      this.currentChunks = [];
      this.currentReceived = 0;
      this.currentId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const task: TransferTask = {
        id: this.currentId,
        name: meta.name,
        size: meta.size,
        mimeType: meta.mimeType,
        direction: "receive",
        progress: 0,
        status: "transferring",
      };
      this.onReceiveStart?.(meta);
      this.onTaskUpdate(task);
    } else if (msg.type === "chunk") {
      // header only, data follows in binary message
    } else if (msg.type === "done") {
      const meta = this.currentMeta;
      const blob = new Blob(this.currentChunks as BlobPart[], {
        type: meta?.mimeType,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta?.name || "file";
      a.click();
      URL.revokeObjectURL(url);
      this.onTaskUpdate({
        id: this.currentId,
        name: meta?.name || "",
        size: meta?.size || 0,
        mimeType: meta?.mimeType || "",
        direction: "receive",
        progress: 100,
        status: "done",
      });
    }
  }

  private handleChunk(buffer: ArrayBuffer) {
    if (!this.currentMeta) return;
    const bytes = new Uint8Array(buffer);
    this.currentChunks.push(bytes);
    this.currentReceived += bytes.byteLength;
    const total = this.currentMeta.size || 1;
    this.onTaskUpdate({
      id: this.currentId,
      name: this.currentMeta.name,
      size: this.currentMeta.size,
      mimeType: this.currentMeta.mimeType,
      direction: "receive",
      progress: Math.min(100, Math.round((this.currentReceived / total) * 100)),
      status: "transferring",
    });
  }

  close() {
    try {
      this.dc?.close();
      this.pc.close();
    } catch {}
  }
}

export type FileMeta = {
  name: string;
  size: number;
  mimeType: string;
};

type ControlMessage = {
  type: "meta" | "chunk" | "done";
  meta?: FileMeta;
  dataOffset?: number;
  total?: number;
};
