"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RichTextEditor, {
  type RichTextEditorHandle,
  type RichTextValue,
} from "./RichTextEditor";
import { MAX_RICH_TEXT_LENGTH } from "@/lib/richText";

type TextTransfer = {
  id: string;
  html: string;
  createdAt: string;
};

const POLL_INTERVAL_MS = 3000;

const emptyDraft: RichTextValue = { html: "", plainText: "" };

function getPlainText(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container.innerText || container.textContent || "";
}

async function copyRichText(html: string) {
  const text = getPlainText(html);
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {
      void 0;
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard tidak dapat diakses.");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TextTransferPanel({ roomId }: { roomId: string }) {
  const [textTransfers, setTextTransfers] = useState<TextTransfer[]>([]);
  const [draft, setDraft] = useState<RichTextValue>(emptyDraft);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [listError, setListError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const editorRef = useRef<RichTextEditorHandle>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/room/${roomId}/texts`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        setListError(data.error || "Gagal memuat transfer teks.");
        return;
      }
      setTextTransfers(data.textTransfers ?? []);
      setListError("");
    } catch {
      setListError("Gagal memuat transfer teks.");
    }
  }, [roomId]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function sendText() {
    if (sending || !draft.plainText.trim()) return;
    if (draft.plainText.length > MAX_RICH_TEXT_LENGTH) {
      setActionError(`Maksimal ${MAX_RICH_TEXT_LENGTH.toLocaleString("id-ID")} karakter.`);
      return;
    }

    setSending(true);
    setActionError("");
    try {
      const response = await fetch(`/api/room/${roomId}/texts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: draft.html }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengirim teks.");
      }
      setTextTransfers((previous) => [data.textTransfer, ...previous]);
      setDraft(emptyDraft);
      editorRef.current?.clear();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Gagal mengirim teks."
      );
    } finally {
      setSending(false);
    }
  }

  async function copyText(transfer: TextTransfer) {
    try {
      await copyRichText(transfer.html);
      setCopiedId(transfer.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === transfer.id ? "" : current));
      }, 1800);
    } catch {
      setActionError("Browser tidak mengizinkan penyalinan teks.");
    }
  }

  async function clearAll() {
    if (!window.confirm("Hapus semua teks yang tersimpan di room ini?")) return;
    setClearing(true);
    setActionError("");
    try {
      const response = await fetch(`/api/room/${roomId}/texts`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menghapus teks.");
      }
      setTextTransfers([]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Gagal menghapus teks.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">Transfer Teks</h3>
          <p className="text-xs text-slate-500">
            Ketik atau tempel teks dengan formatnya.
          </p>
        </div>
        {textTransfers.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            disabled={clearing}
            className="shrink-0 rounded-lg border border-amber-600/60 px-2.5 py-1.5 text-xs text-amber-400 transition hover:border-amber-500 disabled:opacity-50"
          >
            {clearing ? "..." : "Hapus Semua Teks"}
          </button>
        )}
      </div>

      <RichTextEditor
        ref={editorRef}
        disabled={sending}
        onChange={setDraft}
        onSubmitShortcut={() => void sendText()}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {draft.plainText.length.toLocaleString("id-ID")}/
          {MAX_RICH_TEXT_LENGTH.toLocaleString("id-ID")} karakter
        </span>
        <button
          type="button"
          onClick={() => void sendText()}
          disabled={sending || !draft.plainText.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Mengirim..." : "Kirim Teks"}
        </button>
      </div>

      {(actionError || listError) && (
        <div className="mt-3 space-y-1 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {actionError && <p>{actionError}</p>}
          {listError && <p>{listError}</p>}
        </div>
      )}

      <div className="mt-5 border-t border-slate-700 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-sm font-medium text-slate-300">Teks di room</h4>
          <span className="text-xs text-slate-500">
            {textTransfers.length} item
          </span>
        </div>
        {textTransfers.length === 0 ? (
          <p className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-500">
            Belum ada teks yang dikirim.
          </p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
            {textTransfers.map((transfer) => (
              <li
                key={transfer.id}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <time className="text-xs text-slate-500">
                    {formatDate(transfer.createdAt)}
                  </time>
                  <button
                    type="button"
                    onClick={() => void copyText(transfer)}
                    className="shrink-0 rounded-lg border border-emerald-600/60 px-2.5 py-1 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-600/20"
                  >
                    {copiedId === transfer.id ? "Tersalin" : "Salin"}
                  </button>
                </div>
                <div
                  className="rich-text text-sm text-slate-100"
                  dangerouslySetInnerHTML={{ __html: transfer.html }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
