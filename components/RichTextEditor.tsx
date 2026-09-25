"use client";

import DOMPurify from "dompurify";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { RICH_TEXT_ATTRIBUTES, RICH_TEXT_TAGS } from "@/lib/richText";

export type RichTextValue = {
  html: string;
  plainText: string;
};

export type RichTextEditorHandle = {
  clear: () => void;
  focus: () => void;
};

type RichTextEditorProps = {
  disabled?: boolean;
  onChange: (value: RichTextValue) => void;
  onSubmitShortcut?: () => void;
};

type ToolbarButtonProps = {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function ToolbarButton({
  children,
  label,
  onClick,
  disabled,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="min-w-8 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200 transition hover:border-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    { disabled = false, onChange, onSubmitShortcut },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const selectionRef = useRef<Range | null>(null);
    const [editorError, setEditorError] = useState("");

    const notifyChange = useCallback(() => {
      const editor = editorRef.current;
      if (!editor) return;
      onChange({
        html: editor.innerHTML,
        plainText: editor.innerText.replace(/\u00a0/g, " "),
      });
    }, [onChange]);

    function saveSelection() {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        selectionRef.current = range.cloneRange();
      }
    }

    function restoreSelection() {
      const editor = editorRef.current;
      const saved = selectionRef.current;
      if (!editor || !saved || !editor.contains(saved.commonAncestorContainer)) {
        return;
      }
      const selection = window.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      selection.addRange(saved);
    }

    function runCommand(command: string, value?: string) {
      const editor = editorRef.current;
      if (!editor || disabled) return;
      editor.focus();
      restoreSelection();
      document.execCommand(command, false, value);
      saveSelection();
      notifyChange();
      setEditorError("");
    }

    function sanitizeClipboardHtml(html: string) {
      return DOMPurify.sanitize(html, {
        ALLOWED_ATTR: RICH_TEXT_ATTRIBUTES,
        ALLOWED_TAGS: RICH_TEXT_TAGS,
        ALLOW_ARIA_ATTR: false,
        ALLOW_DATA_ATTR: false,
      });
    }

    function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
      event.preventDefault();
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const html = clipboard.getData("text/html");
      const text = clipboard.getData("text/plain");
      if (html) {
        document.execCommand(
          "insertHTML",
          false,
          sanitizeClipboardHtml(html)
        );
      } else if (text) {
        document.execCommand("insertText", false, text);
      }
      saveSelection();
      notifyChange();
      setEditorError("");
    }

    async function copySelection() {
      const editor = editorRef.current;
      if (!editor || disabled) return;
      editor.focus();
      restoreSelection();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setEditorError("Pilih teks yang ingin disalin terlebih dahulu.");
        return;
      }
      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) {
        setEditorError("Pilih teks di dalam editor terlebih dahulu.");
        return;
      }
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());
      const text = selection.toString();
      const html = container.innerHTML;
      try {
        if (
          navigator.clipboard?.write &&
          typeof ClipboardItem !== "undefined"
        ) {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([text], { type: "text/plain" }),
            }),
          ]);
        } else {
          document.execCommand("copy");
        }
        setEditorError("");
      } catch {
        setEditorError("Browser tidak mengizinkan penyalinan. Gunakan Ctrl+C atau menu salin.");
      }
    }

    async function pasteFromClipboard() {
      const editor = editorRef.current;
      if (!editor || disabled) return;
      editor.focus();
      restoreSelection();
      try {
        if (!navigator.clipboard?.read) {
          throw new Error("Clipboard API tidak tersedia.");
        }
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes("text/html")) {
            const html = await (await item.getType("text/html")).text();
            document.execCommand(
              "insertHTML",
              false,
              sanitizeClipboardHtml(html)
            );
            notifyChange();
            setEditorError("");
            return;
          }
          if (item.types.includes("text/plain")) {
            const text = await (await item.getType("text/plain")).text();
            document.execCommand("insertText", false, text);
            notifyChange();
            setEditorError("");
            return;
          }
        }
        throw new Error("Clipboard tidak berisi teks.");
      } catch {
        setEditorError(
          "Tempel otomatis tidak diizinkan. Gunakan Ctrl+V atau menu tempel browser."
        );
      }
    }

    function createLink() {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      restoreSelection();
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setEditorError("Pilih teks terlebih dahulu sebelum membuat tautan.");
        return;
      }
      const url = window.prompt("Masukkan URL");
      if (url?.trim()) runCommand("createLink", url.trim());
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        onSubmitShortcut?.();
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          if (editorRef.current) editorRef.current.innerHTML = "";
          selectionRef.current = null;
          notifyChange();
        },
        focus: () => editorRef.current?.focus(),
      }),
      [notifyChange]
    );

    return (
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/70 p-2">
          <ToolbarButton
            label="Tebal"
            disabled={disabled}
            onClick={() => runCommand("bold")}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            label="Miring"
            disabled={disabled}
            onClick={() => runCommand("italic")}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            label="Garis bawah"
            disabled={disabled}
            onClick={() => runCommand("underline")}
          >
            <u>U</u>
          </ToolbarButton>
          <ToolbarButton
            label="Coret"
            disabled={disabled}
            onClick={() => runCommand("strikeThrough")}
          >
            <s>S</s>
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-700" />
          <select
            aria-label="Format paragraf"
            disabled={disabled}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) runCommand("formatBlock", event.target.value);
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500 disabled:opacity-40"
          >
            <option value="">Paragraf</option>
            <option value="<p>">Normal</option>
            <option value="<h1>">Heading 1</option>
            <option value="<h2>">Heading 2</option>
            <option value="<h3>">Heading 3</option>
            <option value="<blockquote>">Kutipan</option>
            <option value="<pre>">Kode</option>
          </select>
          <select
            aria-label="Ukuran font"
            disabled={disabled}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) runCommand("fontSize", event.target.value);
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500 disabled:opacity-40"
          >
            <option value="">Ukuran</option>
            <option value="1">Sangat kecil</option>
            <option value="2">Kecil</option>
            <option value="3">Normal</option>
            <option value="4">Sedang</option>
            <option value="5">Besar</option>
            <option value="6">Sangat besar</option>
            <option value="7">Raksasa</option>
          </select>
          <select
            aria-label="Jenis font"
            disabled={disabled}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) runCommand("fontName", event.target.value);
            }}
            className="max-w-28 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500 disabled:opacity-40"
          >
            <option value="">Font</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="monospace">Monospace</option>
            <option value="Times New Roman">Times</option>
            <option value="Verdana">Verdana</option>
          </select>
          <span className="mx-1 h-5 w-px bg-slate-700" />
          <ToolbarButton
            label="Daftar berbutir"
            disabled={disabled}
            onClick={() => runCommand("insertUnorderedList")}
          >
            •
          </ToolbarButton>
          <ToolbarButton
            label="Daftar bernomor"
            disabled={disabled}
            onClick={() => runCommand("insertOrderedList")}
          >
            1.
          </ToolbarButton>
          <ToolbarButton
            label="Rata kiri"
            disabled={disabled}
            onClick={() => runCommand("justifyLeft")}
          >
            ≡
          </ToolbarButton>
          <ToolbarButton
            label="Rata tengah"
            disabled={disabled}
            onClick={() => runCommand("justifyCenter")}
          >
            ≡
          </ToolbarButton>
          <ToolbarButton
            label="Rata kanan"
            disabled={disabled}
            onClick={() => runCommand("justifyRight")}
          >
            ≡
          </ToolbarButton>
          <ToolbarButton
            label="Rata kiri dan kanan"
            disabled={disabled}
            onClick={() => runCommand("justifyFull")}
          >
            ≡
          </ToolbarButton>
          <label className="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-300">
            <span>Warna</span>
            <input
              aria-label="Warna teks"
              type="color"
              defaultValue="#e2e8f0"
              disabled={disabled}
              onChange={(event) => runCommand("foreColor", event.target.value)}
              className="h-4 w-6 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
          <label className="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-300">
            <span>Highlight</span>
            <input
              aria-label="Warna sorotan"
              type="color"
              defaultValue="#facc15"
              disabled={disabled}
              onChange={(event) => runCommand("hiliteColor", event.target.value)}
              className="h-4 w-6 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
          <ToolbarButton
            label="Tautan"
            disabled={disabled}
            onClick={createLink}
          >
            Link
          </ToolbarButton>
          <ToolbarButton
            label="Hapus format"
            disabled={disabled}
            onClick={() => runCommand("removeFormat")}
          >
            Bersihkan
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-700" />
          <ToolbarButton
            label="Salin teks terpilih"
            disabled={disabled}
            onClick={copySelection}
          >
            Salin
          </ToolbarButton>
          <ToolbarButton
            label="Tempel dari clipboard"
            disabled={disabled}
            onClick={pasteFromClipboard}
          >
            Tempel
          </ToolbarButton>
        </div>
        <div
          ref={editorRef}
          role="textbox"
          aria-label="Editor teks kaya"
          aria-multiline="true"
          contentEditable={!disabled}
          suppressContentEditableWarning
          spellCheck
          data-placeholder="Ketik, tempel, atau seret teks ke sini..."
          onInput={() => {
            saveSelection();
            notifyChange();
          }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onBlur={saveSelection}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="rich-text rich-text-editor min-h-40 max-h-96 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
        />
        {editorError && (
          <p className="mt-2 text-xs text-amber-300">{editorError}</p>
        )}
        {onSubmitShortcut && (
          <p className="mt-2 text-[11px] text-slate-500">
            Tekan Ctrl+Enter untuk mengirim.
          </p>
        )}
      </div>
    );
  }
);

export default RichTextEditor;
