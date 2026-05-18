import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Gamepad2, Check, X, Plus, Trash2, CheckCircle2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import FileUpload from "@/components/FileUpload";
import {
  adminLogin, adminGetGames, adminCreateGame, adminUpdateGame, adminDeleteGame,
  adminGetProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  adminGetPayments, getPendingMembers, getActiveMembers, getAdminStats, approveMember, rejectMember,
  adminSaveSetting, getSetting, adminApproveManualPayment, adminRejectManualPayment,
  adminGetConfig,
} from "../lib/api";

const TABS = ["Games", "Products", "Orders", "Members", "Banners", "Settings"] as const;
type Tab = typeof TABS[number];

type Game = { id: number; slug: string; name: string; description?: string | null; logoUrl?: string | null; bannerUrl?: string | null; color?: string | null; sortOrder?: number | null; active?: boolean | null; };
type Product = { id: number; gameId: number; title: string; subtitle?: string | null; description?: string | null; priceUsd?: string | null; durationDays?: number | null; bannerUrl?: string | null; videoUrl?: string | null; features?: string | null; galleryImages?: string | null; galleryVideos?: string | null; variants?: string | null; sortOrder?: number | null; active?: boolean | null; };
type Payment = { id: number; userId: number; productId: number; payCurrency?: string | null; payAmount?: string | null; priceAmount?: string | null; status?: string | null; createdAt: string; };
type Member = { id: number; telegramId: string; plan: string; country: string; status: string; createdAt: string; expiryDate?: string | null; };

function Input({ label, value, onChange, type = "text", placeholder = "" }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors" />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder = "", rows = 3 }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <textarea value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none" />
    </div>
  );
}

function Toggle({ label, value, onChange }: any) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={`w-10 h-5.5 rounded-full transition-colors relative ${value ? "bg-cyan-500" : "bg-slate-700"}`} onClick={() => onChange(!value)}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-4.5" : ""}`} />
      </div>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}

function FeaturesEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parseInitial = (v: string): string[] => {
    if (!v) return [""];
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.length ? parsed.map(String) : [""];
    } catch {}
    const lines = v.split("\n").map(s => s.trim()).filter(Boolean);
    return lines.length ? lines : [""];
  };
  const [items, setItems] = useState<string[]>(() => parseInitial(value));
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    const incoming = JSON.stringify(parseInitial(value).filter(s => s.trim().length > 0));
    if (incoming !== lastSentRef.current) {
      setItems(parseInitial(value));
      lastSentRef.current = incoming;
    }
  }, [value]);

  const sync = (next: string[]) => {
    setItems(next);
    const serialized = JSON.stringify(next.filter(s => s.trim().length > 0));
    lastSentRef.current = serialized;
    onChange(serialized);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">What's Included (line by line)</label>
      <div className="space-y-2">
        {items.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" strokeWidth={2.5} />
            <input
              value={line}
              onChange={(e) => { const next = [...items]; next[i] = e.target.value; sync(next); }}
              placeholder={`Feature ${i + 1} (e.g. Unlimited skins)`}
              className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
            <button
              type="button"
              onClick={() => {
                const next = items.filter((_, idx) => idx !== i);
                sync(next.length ? next : [""]);
              }}
              className="shrink-0 w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
              aria-label="Remove feature"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => sync([...items, ""])}
        className="mt-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold transition-all"
      >
        <Plus className="w-3.5 h-3.5" /> Add feature
      </button>
    </div>
  );
}

function parseList(value: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {}
  return value.split("\n").map(s => s.trim()).filter(Boolean);
}

function MediaGalleryEditor({
  label, kind, value, onChange, max = 10,
}: { label: string; kind: "image" | "video"; value: string; onChange: (v: string) => void; max?: number }) {
  const [items, setItems] = useState<string[]>(() => parseList(value));
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    const incoming = JSON.stringify(parseList(value).filter(s => s.trim().length > 0));
    if (incoming !== lastSentRef.current) {
      setItems(parseList(value));
      lastSentRef.current = incoming;
    }
  }, [value]);

  const update = (next: string[]) => {
    setItems(next);
    const serialized = JSON.stringify(next.filter(s => s.trim().length > 0));
    lastSentRef.current = serialized;
    onChange(serialized);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
        {label} <span className="text-slate-600 normal-case">(up to {max})</span>
      </label>
      <div className="space-y-2">
        {items.map((url, i) => (
          <div key={i} className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-lg p-2">
            {kind === "image" ? (
              <img src={url} alt="" className="w-12 h-12 rounded object-cover border border-white/10 shrink-0 bg-slate-800" />
            ) : (
              <div className="w-12 h-12 rounded bg-slate-800 border border-white/10 shrink-0 flex items-center justify-center text-[9px] text-slate-400 font-bold">VIDEO</div>
            )}
            <input
              value={url}
              onChange={(e) => { const next = [...items]; next[i] = e.target.value; update(next); }}
              className="flex-1 min-w-0 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500/50 truncate"
            />
            <span className="text-[10px] text-slate-500 font-mono shrink-0">#{i + 1}</span>
            <button
              type="button"
              onClick={() => update(items.filter((_, idx) => idx !== i))}
              className="shrink-0 w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center"
              aria-label="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      {items.length < max && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <FileUpload
            label={`Upload ${kind}`}
            accept={kind === "image" ? "image/*" : "video/*"}
            onUploaded={(url) => update([...items, url])}
          />
          <button
            type="button"
            onClick={() => update([...items, ""])}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> Paste URL
          </button>
        </div>
      )}
      {items.length === 0 && <p className="text-[11px] text-slate-500 mt-1.5">No {kind}s yet. Upload up to {max}.</p>}
    </div>
  );
}

function VariantsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  type Variant = { days: number | string; price: string };
  const parseInitial = (v: string): Variant[] => {
    try {
      const parsed = JSON.parse(v || "[]");
      if (Array.isArray(parsed)) return parsed.map((x: any) => ({ days: x.days ?? "", price: String(x.price ?? "") }));
    } catch {}
    return [];
  };
  const [arr, setArr] = useState<Variant[]>(() => {
    const init = parseInitial(value);
    return init.length ? init : [{ days: "", price: "" }];
  });
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    const incoming = JSON.stringify(parseInitial(value)
      .map(v => ({ days: parseInt(String(v.days)) || 0, price: String(v.price).trim() }))
      .filter(v => v.days > 0 && v.price.length > 0));
    if (incoming !== lastSentRef.current) {
      const init = parseInitial(value);
      setArr(init.length ? init : [{ days: "", price: "" }]);
      lastSentRef.current = incoming;
    }
  }, [value]);

  const update = (next: Variant[]) => {
    setArr(next);
    const cleaned = next
      .map(v => ({ days: parseInt(String(v.days)) || 0, price: String(v.price).trim() }))
      .filter(v => v.days > 0 && v.price.length > 0);
    const serialized = JSON.stringify(cleaned);
    lastSentRef.current = serialized;
    onChange(serialized);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
        Duration & Pricing Tiers
      </label>
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 px-1">
          <div>Days</div>
          <div>Price (USD)</div>
          <div></div>
        </div>
        <div className="space-y-2">
          {arr.map((v, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input
                type="number"
                min="1"
                value={v.days}
                onChange={(e) => { const next = [...arr]; next[i] = { ...next[i], days: e.target.value }; update(next); }}
                placeholder="30"
                className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              />
              <input
                type="number"
                step="0.01"
                value={v.price}
                onChange={(e) => { const next = [...arr]; next[i] = { ...next[i], price: e.target.value }; update(next); }}
                placeholder="14.99"
                className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="button"
                onClick={() => update(arr.filter((_, idx) => idx !== i))}
                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center"
                aria-label="Remove tier"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => update([...arr, { days: "", price: "" }])}
          className="mt-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold"
        >
          <Plus className="w-3.5 h-3.5" /> Add tier
        </button>
        <p className="text-[10px] text-slate-500 mt-2">Each tier shows on the product page as a selectable duration with its own price. Leave empty to fall back to default Price/Days.</p>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="font-black text-white text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ── Games Tab ─────────────────────────────────────────────────────────────────
function GamesTab({ token }: { token: string }) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState({ slug: "", name: "", description: "", logoUrl: "", bannerUrl: "", color: "#22d3ee", sortOrder: "0", active: true });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => { setLoading(true); adminGetGames(token).then(d => setGames(d.games || [])).finally(() => setLoading(false)); }, [token]);
  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setForm({ slug: "", name: "", description: "", logoUrl: "", bannerUrl: "", color: "#22d3ee", sortOrder: "0", active: true }); setErr(""); setModal("add"); }
  function openEdit(g: Game) { setEditing(g); setForm({ slug: g.slug, name: g.name, description: g.description || "", logoUrl: g.logoUrl || "", bannerUrl: g.bannerUrl || "", color: g.color || "#22d3ee", sortOrder: String(g.sortOrder || 0), active: g.active ?? true }); setErr(""); setModal("edit"); }

  async function save() {
    setSaving(true); setErr("");
    try {
      const data = { ...form, sortOrder: parseInt(form.sortOrder) || 0 };
      if (modal === "add") await adminCreateGame(token, data);
      else if (editing) await adminUpdateGame(token, editing.id, data);
      load(); setModal(null);
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  async function del(id: number) {
    if (!confirm("Delete this game? All products will be orphaned.")) return;
    await adminDeleteGame(token, id); load();
  }

  const f = (k: keyof typeof form) => (v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-white">Games <span className="text-slate-500 font-normal text-base">({games.length})</span></h2>
        <button onClick={openAdd} className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20">+ Add Game</button>
      </div>

      {loading ? <div className="text-slate-500 text-sm">Loading…</div> : (
        <div className="space-y-3">
          {games.map(g => (
            <div key={g.id} className="flex items-center gap-4 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 hover:border-white/10 transition-colors">
              {g.logoUrl ? <img src={g.logoUrl} className="w-10 h-10 rounded-lg object-contain flex-shrink-0" alt="" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${g.color || "#22d3ee"}20` }}><Gamepad2 className="w-5 h-5" style={{ color: g.color || "#22d3ee" }} /></div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{g.name}</span>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{g.slug}</span>
                  {!g.active && <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Hidden</span>}
                </div>
                {g.description && <p className="text-xs text-slate-500 truncate">{g.description}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(g)} className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors">Edit</button>
                <button onClick={() => del(g.id)} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition-colors">Delete</button>
              </div>
            </div>
          ))}
          {games.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No games yet. Add your first game.</p>}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Add Game" : "Edit Game"} onClose={() => setModal(null)}>
          {modal === "add" && <Input label="Slug (URL-friendly)" value={form.slug} onChange={f("slug")} placeholder="pubg-mobile" />}
          <Input label="Name" value={form.name} onChange={f("name")} placeholder="PUBG Mobile" />
          <TextArea label="Description" value={form.description} onChange={f("description")} placeholder="Short description…" rows={2} />
          <div>
            <Input label="Logo URL" value={form.logoUrl} onChange={f("logoUrl")} placeholder="https://…/logo.png" />
            <div className="mt-1.5 flex items-center gap-2">
              <FileUpload label="Upload logo" accept="image/*" onUploaded={(url) => f("logoUrl")(url)} />
              {form.logoUrl && <img src={form.logoUrl} alt="" className="w-8 h-8 rounded object-cover border border-white/10" />}
            </div>
          </div>
          <div>
            <Input label="Banner URL" value={form.bannerUrl} onChange={f("bannerUrl")} placeholder="https://…/banner.jpg" />
            <div className="mt-1.5 flex items-center gap-2">
              <FileUpload label="Upload banner" accept="image/*" onUploaded={(url) => f("bannerUrl")(url)} />
              {form.bannerUrl && <img src={form.bannerUrl} alt="" className="w-14 h-8 rounded object-cover border border-white/10" />}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Accent Color" value={form.color} onChange={f("color")} placeholder="#22d3ee" />
            <Input label="Sort Order" value={form.sortOrder} onChange={f("sortOrder")} type="number" />
          </div>
          <Toggle label="Active (visible on homepage)" value={form.active} onChange={f("active")} />
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
            {saving ? "Saving…" : "Save Game"}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Products Tab ──────────────────────────────────────────────────────────────
function ProductsTab({ token }: { token: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ gameId: "", title: "", subtitle: "", description: "", priceUsd: "", durationDays: "30", bannerUrl: "", videoUrl: "", features: "", galleryImages: "", galleryVideos: "", variants: "", downloadLink: "", sortOrder: "0", active: true });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      adminGetProducts(token).then(d => setProducts(d.products || [])).catch(() => {}),
      adminGetGames(token).then(d => setGames(d.games || [])).catch(() => {}),
    ]);
    setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  function blankForm() { return { gameId: "", title: "", subtitle: "", description: "", priceUsd: "14.99", durationDays: "30", bannerUrl: "", videoUrl: "", features: "", galleryImages: "", galleryVideos: "", variants: "", downloadLink: "", sortOrder: "0", active: true }; }
  function openAdd() { setEditing(null); setForm(blankForm()); setErr(""); setModal("add"); }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({ gameId: String(p.gameId), title: p.title, subtitle: p.subtitle || "", description: p.description || "", priceUsd: p.priceUsd || "14.99", durationDays: String(p.durationDays || 30), bannerUrl: p.bannerUrl || "", videoUrl: p.videoUrl || "", features: p.features || "", galleryImages: p.galleryImages || "", galleryVideos: p.galleryVideos || "", variants: p.variants || "", downloadLink: (p as any).downloadLink || "", sortOrder: String(p.sortOrder || 0), active: p.active ?? true });
    setErr(""); setModal("edit");
  }

  async function save() {
    setSaving(true); setErr("");
    try {
      let priceUsd = form.priceUsd;
      let durationDays = parseInt(form.durationDays) || 30;
      try {
        const tiers = JSON.parse(form.variants || "[]");
        if (Array.isArray(tiers) && tiers.length > 0) {
          const sorted = [...tiers].sort((a: any, b: any) => (parseInt(a.days) || 0) - (parseInt(b.days) || 0));
          const mid = sorted[Math.floor(sorted.length / 2)] || sorted[0];
          if (mid?.days) durationDays = parseInt(String(mid.days)) || durationDays;
          if (mid?.price) priceUsd = String(mid.price);
        }
      } catch {}
      if (!priceUsd) priceUsd = "14.99";
      const data = { ...form, priceUsd, durationDays, sortOrder: parseInt(form.sortOrder) || 0 };
      if (modal === "add") await adminCreateProduct(token, data);
      else if (editing) await adminUpdateProduct(token, editing.id, data);
      load(); setModal(null);
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  async function del(id: number) {
    if (!confirm("Delete this product?")) return;
    await adminDeleteProduct(token, id); load();
  }

  const f = (k: keyof typeof form) => (v: any) => setForm(p => ({ ...p, [k]: v }));
  const gameName = (id: number) => games.find(g => g.id === id)?.name || `Game #${id}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-white">Products <span className="text-slate-500 font-normal text-base">({products.length})</span></h2>
        <button onClick={openAdd} className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20">+ Add Product</button>
      </div>

      {loading ? <div className="text-slate-500 text-sm">Loading…</div> : (
        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id} className="flex gap-4 bg-slate-900/50 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
              {p.bannerUrl && <img src={p.bannerUrl} className="w-16 h-12 rounded-lg object-cover flex-shrink-0" alt="" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm">{p.title}</span>
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded font-mono">{gameName(p.gameId)}</span>
                  <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded font-bold">${p.priceUsd}</span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">{p.durationDays}d</span>
                  {!p.active && <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Hidden</span>}
                </div>
                {p.description && <p className="text-xs text-slate-500 mt-1 truncate">{p.description}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors">Edit</button>
                <button onClick={() => del(p.id)} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition-colors">Del</button>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No products yet.</p>}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Add Product" : "Edit Product"} onClose={() => setModal(null)}>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Game</label>
            <select value={form.gameId} onChange={e => f("gameId")(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50">
              <option value="">Select a game…</option>
              {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <Input label="Title" value={form.title} onChange={f("title")} placeholder="VIP Gold Package" />
          <Input label="Subtitle" value={form.subtitle} onChange={f("subtitle")} placeholder="Best value · Most popular" />

          {/* Thumbnail / cover image */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Product Thumbnail <span className="normal-case text-slate-600">(shown on game page card)</span>
            </label>
            {form.bannerUrl && (
              <div className="mb-2 relative w-full aspect-square rounded-xl overflow-hidden bg-slate-900 border border-white/10 max-w-[140px]">
                <img src={form.bannerUrl} alt="Thumbnail preview" className="absolute inset-0 w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => f("bannerUrl")("")}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-500/80 transition-all"
                  aria-label="Remove thumbnail"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <FileUpload label="Upload thumbnail" accept="image/*" onUploaded={(url) => f("bannerUrl")(url)} />
            {!form.bannerUrl && <p className="text-[11px] text-slate-500 mt-1">No thumbnail set — game banner will be used as fallback.</p>}
          </div>

          <FeaturesEditor value={form.features} onChange={f("features")} />

          <MediaGalleryEditor label="Product Images" kind="image" value={form.galleryImages} onChange={f("galleryImages")} max={10} />
          <MediaGalleryEditor label="Product Videos" kind="video" value={form.galleryVideos} onChange={f("galleryVideos")} max={10} />

          <VariantsEditor value={form.variants} onChange={f("variants")} />

          {/* VIP Download Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              VIP Download Link <span className="normal-case text-slate-600">(user ko approve hone par milega)</span>
            </label>
            <input
              type="url"
              value={form.downloadLink}
              onChange={e => f("downloadLink")(e.target.value)}
              placeholder="https://drive.google.com/… ya koi bhi link"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <p className="text-[11px] text-slate-600 mt-1">Is product ka VIP file link — sirf approved users ko milega</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Sort Order" value={form.sortOrder} onChange={f("sortOrder")} type="number" />
            <div className="flex items-end pb-1"><Toggle label="Active" value={form.active} onChange={f("active")} /></div>
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
            {saving ? "Saving…" : "Save Product"}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Orders Tab ────────────────────────────────────────────────────────────────
function OrdersTab({ token }: { token: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    adminGetPayments(token).then(d => setPayments(d.payments || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const statusColor = (s: string | null | undefined) => {
    if (!s) return "text-slate-500";
    if (["finished", "confirmed"].includes(s)) return "text-green-400";
    if (["failed", "expired", "refunded"].includes(s)) return "text-red-400";
    if (["confirming", "sending"].includes(s)) return "text-yellow-400";
    if (s === "manual_pending") return "text-amber-400";
    return "text-cyan-400";
  };

  async function handleApprove(id: number) {
    setActionLoading(id);
    try { await adminApproveManualPayment(token, id); load(); }
    catch (e: any) { alert(e.message || "Failed"); }
    finally { setActionLoading(null); }
  }

  async function handleReject(id: number) {
    if (!confirm("Reject this payment?")) return;
    setActionLoading(id);
    try { await adminRejectManualPayment(token, id); load(); }
    catch (e: any) { alert(e.message || "Failed"); }
    finally { setActionLoading(null); }
  }

  const pending = payments.filter(p => p.status === "manual_pending");
  const rest = payments.filter(p => p.status !== "manual_pending");

  return (
    <div>
      <h2 className="text-xl font-black text-white mb-6">Orders <span className="text-slate-500 font-normal text-base">({payments.length})</span></h2>
      {loading ? <div className="text-slate-500 text-sm">Loading…</div> : (
        <>
          {/* Manual pending — highlighted section */}
          {pending.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">Binance Manual — Pending Verification ({pending.length})</h3>
              </div>
              <div className="space-y-2">
                {pending.map(p => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                    style={{ background: "rgba(243,186,47,0.06)", borderColor: "rgba(243,186,47,0.2)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-amber-300 text-xs font-black">#{p.id}</span>
                        <span className="text-slate-300 text-sm">User #{p.userId} · Product #{p.productId}</span>
                        <span className="text-amber-300 font-bold text-sm">${p.priceAmount}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">TX: {(p as any).payAddress || "—"}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{new Date(p.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleApprove(p.id)} disabled={actionLoading === p.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold transition-colors disabled:opacity-50">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleReject(p.id)} disabled={actionLoading === p.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-colors disabled:opacity-50">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-b border-white/5 mt-5 mb-5" />
            </div>
          )}

          {/* All orders table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-white/5">
                  <th className="text-left py-2 pr-4">ID</th>
                  <th className="text-left py-2 pr-4">User</th>
                  <th className="text-left py-2 pr-4">Product</th>
                  <th className="text-left py-2 pr-4">Amount</th>
                  <th className="text-left py-2 pr-4">Currency</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rest.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4 font-mono text-slate-400">#{p.id}</td>
                    <td className="py-3 pr-4 text-slate-300">User #{p.userId}</td>
                    <td className="py-3 pr-4 text-slate-300">Product #{p.productId}</td>
                    <td className="py-3 pr-4 text-white font-semibold">${p.priceAmount}</td>
                    <td className="py-3 pr-4 text-cyan-400 font-mono text-xs uppercase">{p.payCurrency}</td>
                    <td className="py-3 pr-4"><span className={`text-xs font-bold uppercase ${statusColor(p.status)}`}>{p.status || "waiting"}</span></td>
                    <td className="py-3 text-slate-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rest.length === 0 && pending.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No orders yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────
function MembersTab({ token }: { token: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "active" | "all">("pending");

  const load = useCallback(() => {
    setLoading(true);
    const fn = filter === "pending" ? getPendingMembers : filter === "active" ? getActiveMembers : (t: string) => import("../lib/api").then(m => m.getAllMembers(t));
    fn(token).then(d => setMembers(d.members || d || [])).finally(() => setLoading(false));
  }, [token, filter]);
  useEffect(() => { load(); }, [load]);

  async function approve(id: number) { await approveMember(id, token); load(); }
  async function reject(id: number) { await rejectMember(id, token); load(); }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-white">Members</h2>
        <div className="flex gap-1 bg-slate-900 rounded-lg p-1">
          {(["pending","active","all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-all capitalize ${filter === f ? "bg-cyan-500 text-white" : "text-slate-500 hover:text-white"}`}>{f}</button>
          ))}
        </div>
      </div>
      {loading ? <div className="text-slate-500 text-sm">Loading…</div> : (
        <div className="space-y-3">
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center gap-4 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm">@{m.telegramId}</span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">{m.plan}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${m.status === "active" ? "bg-green-500/10 text-green-400" : m.status === "pending" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"}`}>{m.status}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{m.country} · {new Date(m.createdAt).toLocaleDateString()}</p>
              </div>
              {m.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => approve(m.id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold transition-colors"><Check className="w-3.5 h-3.5" /> Approve</button>
                  <button onClick={() => reject(m.id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-colors"><X className="w-3.5 h-3.5" /> Reject</button>
                </div>
              )}
            </div>
          ))}
          {members.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No {filter} members.</p>}
        </div>
      )}
    </div>
  );
}

// ── Banners Tab ───────────────────────────────────────────────────────────────
const DEFAULT_BANNERS = [
  "/banners/banner1.jpg",
  "/banners/banner2.jpg",
  "/banners/banner3.jpg",
  "/banners/banner4.jpg",
  "/banners/banner5.jpg",
  "/banners/banner6.jpg",
  "/banners/banner7.jpg",
  "/banners/banner8.jpg",
];

async function saveBanners(token: string, list: string[]) {
  try {
    const val = JSON.stringify(list);
    localStorage.setItem("zakpubg_banners", val);
    await adminSaveSetting(token, "home_banners", val);
    window.dispatchEvent(new Event("zakpubg_banners_updated"));
  } catch {}
}

async function loadBannersAdmin(token: string): Promise<string[]> {
  try {
    const val = await getSetting("home_banners");
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem("zakpubg_banners", val);
        return parsed;
      }
    }
  } catch {}
  // fallback to localStorage
  try {
    const stored = localStorage.getItem("zakpubg_banners");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_BANNERS;
}

async function saveGameBanners(token: string, slug: string, list: string[]) {
  try {
    const val = JSON.stringify(list);
    localStorage.setItem(`zakpubg_game_banners_${slug}`, val);
    await adminSaveSetting(token, `game_banners_${slug}`, val);
    window.dispatchEvent(new Event(`zakpubg_game_banners_updated_${slug}`));
  } catch {}
}

async function loadGameBanners(slug: string): Promise<string[]> {
  try {
    const val = await getSetting(`game_banners_${slug}`);
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(`zakpubg_game_banners_${slug}`, val);
        return parsed;
      }
    }
  } catch {}
  // fallback to localStorage
  try {
    const stored = localStorage.getItem(`zakpubg_game_banners_${slug}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

function GameBannersSection({ token }: { token: string }) {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [banners, setBanners] = useState<string[]>([]);

  useEffect(() => {
    adminGetGames(token).then(d => {
      const list = d.games || [];
      setGames(list);
      if (list.length > 0 && !selectedSlug) {
        const firstSlug = list[0].slug;
        setSelectedSlug(firstSlug);
        loadGameBanners(firstSlug).then(setBanners);
      }
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (selectedSlug) loadGameBanners(selectedSlug).then(setBanners);
  }, [selectedSlug]);

  function add(url: string) {
    const next = [...banners, url];
    setBanners(next);
    saveGameBanners(token, selectedSlug, next);
  }
  function remove(i: number) {
    const next = banners.filter((_, idx) => idx !== i);
    setBanners(next);
    saveGameBanners(token, selectedSlug, next);
  }
  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...banners]; [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setBanners(next); saveGameBanners(token, selectedSlug, next);
  }
  function moveDown(i: number) {
    if (i === banners.length - 1) return;
    const next = [...banners]; [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setBanners(next); saveGameBanners(token, selectedSlug, next);
  }
  function clearAll() {
    setBanners([]);
    saveGameBanners(token, selectedSlug, []);
  }

  const selectedGame = games.find(g => g.slug === selectedSlug);

  return (
    <div className="mt-10 pt-8 border-t border-white/10">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Game Page Banners</h2>
          <p className="text-xs text-slate-500 mt-0.5">Upload banners shown in the carousel when a game page is opened.</p>
        </div>
        {selectedSlug && banners.length > 0 && (
          <button onClick={clearAll} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold transition-all border border-red-500/20">
            Clear All
          </button>
        )}
      </div>

      {/* Game selector */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Select Game</label>
        <div className="flex flex-wrap gap-2">
          {games.map(g => (
            <button
              key={g.slug}
              onClick={() => setSelectedSlug(g.slug)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                selectedSlug === g.slug
                  ? "bg-violet-600 text-white border-violet-500"
                  : "bg-slate-900/60 text-slate-300 border-white/10 hover:border-violet-400/40 hover:text-white"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {selectedGame && (
        <>
          <div className="space-y-3 mb-5">
            {banners.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-6 bg-slate-900/30 rounded-xl border border-white/5">
                No banners yet for <span className="text-slate-400 font-bold">{selectedGame.name}</span>. Upload one below.
              </p>
            ) : (
              banners.map((src, i) => (
                <div key={src + i} className="flex items-center gap-3 bg-slate-900/50 border border-white/5 rounded-xl p-2">
                  <img src={src} alt={`Banner ${i + 1}`} className="w-24 h-14 rounded-lg object-cover flex-shrink-0 border border-white/10 bg-slate-800" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 font-bold truncate">Slide {i + 1}</p>
                    <p className="text-[10px] text-slate-600 truncate">{src}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => moveUp(i)} disabled={i === 0} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 flex items-center justify-center text-slate-300 text-xs font-bold">↑</button>
                    <button onClick={() => moveDown(i)} disabled={i === banners.length - 1} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 flex items-center justify-center text-slate-300 text-xs font-bold">↓</button>
                    <button onClick={() => remove(i)} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/25 flex items-center justify-center text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Add Banner for {selectedGame.name}</p>
            <FileUpload label="Upload banner image" accept="image/*" onUploaded={add} />
          </div>
        </>
      )}
    </div>
  );
}

function BannersTab({ token }: { token: string }) {
  const [banners, setBanners] = useState<string[]>(DEFAULT_BANNERS);

  useEffect(() => {
    loadBannersAdmin(token).then(setBanners);
  }, [token]);

  function remove(i: number) {
    const next = banners.filter((_, idx) => idx !== i);
    setBanners(next);
    saveBanners(token, next);
  }

  function addUploaded(url: string) {
    const next = [...banners, url];
    setBanners(next);
    saveBanners(token, next);
  }

  function reset() {
    setBanners(DEFAULT_BANNERS);
    saveBanners(token, DEFAULT_BANNERS);
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...banners];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setBanners(next);
    saveBanners(token, next);
  }

  function moveDown(i: number) {
    if (i === banners.length - 1) return;
    const next = [...banners];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setBanners(next);
    saveBanners(token, next);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Banner Slides</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage the homepage carousel images. Changes apply instantly.</p>
        </div>
        <button onClick={reset} className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all border border-white/10">Reset to defaults</button>
      </div>

      {/* Current banners */}
      <div className="space-y-3 mb-6">
        {banners.map((src, i) => (
          <div key={src + i} className="flex items-center gap-3 bg-slate-900/50 border border-white/5 rounded-xl p-2">
            <img src={src} alt={`Banner ${i + 1}`} className="w-24 h-14 rounded-lg object-cover flex-shrink-0 border border-white/10 bg-slate-800" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 font-bold truncate">Slide {i + 1}</p>
              <p className="text-[10px] text-slate-600 truncate">{src}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => moveUp(i)} disabled={i === 0} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 flex items-center justify-center text-slate-300 transition-all text-xs font-bold">↑</button>
              <button onClick={() => moveDown(i)} disabled={i === banners.length - 1} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 flex items-center justify-center text-slate-300 transition-all text-xs font-bold">↓</button>
              <button onClick={() => remove(i)} disabled={banners.length <= 1} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/25 disabled:opacity-20 flex items-center justify-center text-red-400 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new banner */}
      <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Add New Banner</p>
        <FileUpload label="Upload banner image" accept="image/*" onUploaded={addUploaded} />
      </div>

      <GameBannersSection token={token} />
    </div>
  );
}

// ── Main Admin ────────────────────────────────────────────────────────────────
export default function Admin() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(() => { try { return sessionStorage.getItem("zak_admin_token"); } catch { return null; } });
  const [tab, setTab] = useState<Tab>("Games");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (token) {
      getAdminStats(token).then(d => setStats(d)).catch(() => {});
    }
  }, [token]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginErr(""); setLoginLoading(true);
    try {
      const data = await adminLogin(loginForm.username, loginForm.password);
      setToken(data.token);
      try { sessionStorage.setItem("zak_admin_token", data.token); } catch {}
    } catch (e: any) { setLoginErr(e.message || "Invalid credentials"); }
    finally { setLoginLoading(false); }
  }

  function logout() { setToken(null); try { sessionStorage.removeItem("zak_admin_token"); } catch {} }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <BrandLogo size={56} className="mx-auto mb-3 drop-shadow-[0_0_18px_rgba(168,85,247,0.55)]" />
            <div className="font-black text-xl tracking-tight leading-none">
              <span className="text-white">ZAK</span>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span>
              <span className="text-white">SKIN</span>
            </div>
            <h1 className="text-sm font-bold text-slate-300 mt-2">Admin Panel</h1>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Management Console</p>
          </div>
          <form onSubmit={handleLogin} className="bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <Input label="Username" value={loginForm.username} onChange={(v: string) => setLoginForm(p => ({ ...p, username: v }))} placeholder="admin" />
            <Input label="Password" value={loginForm.password} onChange={(v: string) => setLoginForm(p => ({ ...p, password: v }))} type="password" placeholder="••••••••" />
            {loginErr && <p className="text-red-400 text-sm">{loginErr}</p>}
            <button type="submit" disabled={loginLoading} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
              {loginLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <button onClick={() => navigate("/")} className="mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors block text-center w-full">← Back to site</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a12]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2" aria-label="ZakPubgSkin home">
            <BrandLogo size={26} className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            <span className="font-black text-sm tracking-tight leading-none"><span className="text-white">ZAK</span><span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span><span className="text-white">SKIN</span> <span className="text-slate-600 font-normal ml-1">Admin</span></span>
          </button>
          <div className="flex items-center gap-4">
            {stats && (
              <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                <span><b className="text-white">{stats.pending || 0}</b> pending</span>
                <span><b className="text-white">{stats.active || 0}</b> active</span>
              </div>
            )}
            <button onClick={logout} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all font-semibold">Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-18 pb-12">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/50 border border-white/5 rounded-xl p-1 mb-6 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 min-w-[72px] px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${tab === t ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}>{t}</button>
          ))}
        </div>

        {tab === "Games" && <GamesTab token={token} />}
        {tab === "Products" && <ProductsTab token={token} />}
        {tab === "Orders" && <OrdersTab token={token} />}
        {tab === "Members" && <MembersTab token={token} />}
        {tab === "Banners" && <BannersTab token={token} />}
        {tab === "Settings" && <SettingsTab token={token} />}
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
const PK_METHODS_SETTINGS = [
  { id: "jazz",      label: "JazzCash",    emoji: "🟠", color: "#F26522", numLabel: "JazzCash Number",   namePlaceholder: "Account holder name" },
  { id: "easypaisa", label: "Easypaisa",   emoji: "🟢", color: "#1BA649", numLabel: "Easypaisa Number",  namePlaceholder: "Account holder name" },
  { id: "nayapay",   label: "NayaPay",     emoji: "🔵", color: "#4F46E5", numLabel: "NayaPay ID / No.", namePlaceholder: "Account holder name" },
  { id: "meezan",    label: "Meezan Bank", emoji: "🟤", color: "#006341", numLabel: "Account Number / IBAN", namePlaceholder: "Account holder name" },
  { id: "binance",   label: "Binance Pay", emoji: "💛", color: "#f3ba2f", numLabel: "Binance Pay ID",    namePlaceholder: "Display name" },
];

const API_CRED_SECTIONS = [
  {
    title: "Telegram Bot",
    color: "#29a8e8",
    emoji: "🤖",
    fields: [
      { key: "cfg_vipbot_token",          label: "Bot Token",         placeholder: "123456:ABC...",  secret: true  },
      { key: "cfg_vipbot_admin_chat_id",  label: "Admin Chat ID",     placeholder: "e.g. 123456789", secret: false },
      { key: "cfg_vip_group_id",          label: "VIP Group ID",      placeholder: "e.g. -100123...", secret: false },
    ],
  },
  {
    title: "NOWPayments (Crypto)",
    color: "#f7931a",
    emoji: "₿",
    fields: [
      { key: "cfg_nowpayments_api_key",    label: "API Key",       placeholder: "nowpayments api key", secret: true },
      { key: "cfg_nowpayments_ipn_secret", label: "IPN Secret",    placeholder: "ipn secret key",      secret: true },
    ],
  },
  {
    title: "Email / Resend",
    color: "#6366f1",
    emoji: "📧",
    fields: [
      { key: "cfg_resend_api_key", label: "Resend API Key", placeholder: "re_...",              secret: true  },
      { key: "cfg_from_email",     label: "From Email",     placeholder: "noreply@yourdomain.com", secret: false },
    ],
  },
  {
    title: "Admin & General",
    color: "#f59e0b",
    emoji: "⚙️",
    fields: [
      { key: "cfg_admin_username",    label: "Admin Username",   placeholder: "admin",                    secret: false },
      { key: "cfg_admin_password",    label: "Admin Password",   placeholder: "strong password",          secret: true  },
      { key: "cfg_webhook_base_url",  label: "Webhook Base URL", placeholder: "https://yoursite.com",     secret: false },
    ],
  },
];

function SettingsTab({ token }: { token: string }) {
  const [methods, setMethods] = useState<Record<string, { num: string; name: string }>>({
    jazz: { num: "", name: "" }, easypaisa: { num: "", name: "" }, nayapay: { num: "", name: "" }, meezan: { num: "", name: "" }, binance: { num: "", name: "" },
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const [creds, setCreds] = useState<Record<string, string>>({});
  const [credSaving, setCredSaving] = useState(false);
  const [credSaved,  setCredSaved]  = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all(PK_METHODS_SETTINGS.flatMap(m => [
      getSetting(`${m.id}_num`).then(v => ({ id: m.id, field: "num",  val: v || "" })),
      getSetting(`${m.id}_name`).then(v => ({ id: m.id, field: "name", val: v || "" })),
    ])).then(results => {
      const updated: Record<string, { num: string; name: string }> = {
        jazz: { num: "", name: "" }, easypaisa: { num: "", name: "" }, nayapay: { num: "", name: "" }, meezan: { num: "", name: "" }, binance: { num: "", name: "" },
      };
      results.forEach(r => { (updated[r.id] as any)[r.field] = r.val; });
      setMethods(updated);
    });

    adminGetConfig(token).then(cfg => setCreds(cfg)).catch(() => {});
  }, []);

  function update(id: string, field: "num" | "name", val: string) {
    setMethods(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  }

  async function save() {
    setSaving(true); setSaved(false);
    try {
      await Promise.all(PK_METHODS_SETTINGS.flatMap(m => [
        adminSaveSetting(token, `${m.id}_num`,  methods[m.id]?.num  || ""),
        adminSaveSetting(token, `${m.id}_name`, methods[m.id]?.name || ""),
      ]));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { alert(e.message || "Save failed"); }
    finally { setSaving(false); }
  }

  async function saveCreds() {
    setCredSaving(true); setCredSaved(false);
    try {
      await Promise.all(
        Object.entries(creds)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => adminSaveSetting(token, k, v))
      );
      setCredSaved(true);
      setTimeout(() => setCredSaved(false), 2500);
    } catch (e: any) { alert(e.message || "Save failed"); }
    finally { setCredSaving(false); }
  }

  function toggleShow(key: string) {
    setShowSecret(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="max-w-2xl space-y-10">

      {/* ── Payment Account Numbers ── */}
      <div>
        <h2 className="text-xl font-black text-white mb-1">Payment Settings</h2>
        <p className="text-slate-500 text-sm mb-5">Account numbers shown to users when paying via Pakistani methods.</p>
        <div className="space-y-4 mb-6">
          {PK_METHODS_SETTINGS.map(m => (
            <div key={m.id} className="bg-slate-900/50 border border-white/8 rounded-2xl p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-lg">{m.emoji}</span>
                <h3 className="text-sm font-black text-white">{m.label}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{m.numLabel}</label>
                  <input
                    value={methods[m.id]?.num || ""}
                    onChange={e => update(m.id, "num", e.target.value)}
                    placeholder={m.id === "binance" ? "e.g. 123456789" : "e.g. 03XX-XXXXXXX"}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors font-mono"
                    style={{ borderColor: methods[m.id]?.num ? `${m.color}40` : "" }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Display Name</label>
                  <input
                    value={methods[m.id]?.name || ""}
                    onChange={e => update(m.id, "name", e.target.value)}
                    placeholder={m.namePlaceholder}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                    style={{ borderColor: methods[m.id]?.name ? `${m.color}40` : "" }}
                  />
                </div>
              </div>
              {methods[m.id]?.num && (
                <p className="text-[10px] mt-2" style={{ color: m.color }}>
                  ✓ Will show: <span className="text-white font-mono">{methods[m.id].num}</span>
                  {methods[m.id].name && <span className="text-slate-400"> — {methods[m.id].name}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
          style={{ background: saved ? "#16a34a" : "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 4px 14px -4px rgba(124,58,237,0.4)" }}>
          {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
            : saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            : "Save Payment Settings"}
        </button>
      </div>

      {/* ── API Credentials ── */}
      <div>
        <h2 className="text-xl font-black text-white mb-1">API Credentials</h2>
        <p className="text-slate-500 text-sm mb-5">Enter your API keys here. Values are stored securely in the database and applied immediately — no server restart needed.</p>

        <div className="space-y-5 mb-6">
          {API_CRED_SECTIONS.map(section => (
            <div key={section.title} className="bg-slate-900/50 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">{section.emoji}</span>
                <h3 className="text-sm font-black text-white">{section.title}</h3>
                <div className="flex-1 h-px ml-2" style={{ background: `${section.color}30` }} />
              </div>
              <div className="space-y-3">
                {section.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.secret && !showSecret[field.key] ? "password" : "text"}
                        value={creds[field.key] || ""}
                        onChange={e => setCreds(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-white/25 transition-colors font-mono"
                        style={{ borderColor: creds[field.key] ? `${section.color}50` : "" }}
                      />
                      {field.secret && (
                        <button
                          type="button"
                          onClick={() => toggleShow(field.key)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                        >
                          {showSecret[field.key] ? "🙈" : "👁️"}
                        </button>
                      )}
                    </div>
                    {creds[field.key] && (
                      <p className="text-[10px] mt-1" style={{ color: section.color }}>✓ Set</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={saveCreds} disabled={credSaving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
          style={{ background: credSaved ? "#16a34a" : "linear-gradient(135deg,#0ea5e9,#6366f1)", boxShadow: "0 4px 14px -4px rgba(99,102,241,0.4)" }}>
          {credSaving ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
            : credSaved ? <><CheckCircle2 className="w-4 h-4" /> Credentials Saved!</>
            : "Save API Credentials"}
        </button>
      </div>

    </div>
  );
}
