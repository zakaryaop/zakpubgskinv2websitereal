import { useRef, useState } from "react";
import { Upload, Loader2, Check } from "lucide-react";

type Props = {
  accept?: string;
  label?: string;
  onUploaded: (url: string) => void;
  className?: string;
};

export default function FileUpload({ accept = "image/*", label = "Upload", onUploaded, className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pct, setPct] = useState(0);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setDone(false);
    setBusy(true);
    setPct(0);
    try {
      const meta = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
      });
      if (!meta.ok) throw new Error(`Could not get upload URL (${meta.status})`);
      const { uploadURL, objectPath } = await meta.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setPct(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });

      const servedUrl = `/api/storage${objectPath}`;
      onUploaded(servedUrl);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={accept} onChange={handlePick} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-all disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : done ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Upload className="w-3.5 h-3.5" />}
        {busy ? `${pct}%` : done ? "Done" : label}
      </button>
      {err && <p className="text-[10px] text-red-400 mt-1">{err}</p>}
    </div>
  );
}
