import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, CATEGORIES } from "../api.js";
import { Empty, Err, FoodArt, Icon, OfferCard, Pager, SkeletonGrid, fmt, paginate, pct, useTitle } from "../components/ui.jsx";
import { useReserve } from "../components/useReserve.js";

const SORTS = { relevance: "Pertinence", popular: "Les plus demandés", new: "Nouveautés", soon: "Retrait bientôt", cheap: "Prix croissant", dear: "Prix décroissant", discount: "Plus grosse réduction" };
const sorters = { relevance: (a, b) => b.sold * 2 + pct(b) / 10 - (a.sold * 2 + pct(a) / 10), popular: (a, b) => b.sold - a.sold, new: (a, b) => b.createdAt - a.createdAt, soon: (a, b) => a.pickupTo.localeCompare(b.pickupTo), cheap: (a, b) => a.price - b.price, dear: (a, b) => b.price - a.price, discount: (a, b) => pct(b) - pct(a) };

export default function Catalog({ me }) {
  useTitle("Catalogue");
  const [params, setParams] = useSearchParams(), { reserve, msg } = useReserve(me);
  const cat = params.get("cat") || "", shop = params.get("shop") || "", sort = params.get("sort") || "relevance", max = params.get("max") || "";
  const [offers, setOffers] = useState(null), [err, setErr] = useState(""), [q, setQ] = useState(params.get("q") || "");
  const load = () => api("/api/offers").then(setOffers).catch(x => { setErr(x.message); setOffers([]); });
  useEffect(() => { load(); }, []);
  const set = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); if (k !== "page") p.delete("page"); setParams(p, { replace: true }); };
  useEffect(() => { const t = setTimeout(() => { if (q !== (params.get("q") || "")) set("q", q); }, 250); return () => clearTimeout(t); }, [q]);

  const all = offers || [], top = Math.ceil(Math.max(10, ...all.map(o => o.price)));
  const shown = useMemo(() => {
    const s = (params.get("q") || "").toLowerCase();
    return all.filter(o => (!cat || o.category === cat) && (!shop || o.shopId === shop) && (!max || o.price <= +max) && (!s || `${o.title} ${o.shopName} ${o.description || ""}`.toLowerCase().includes(s))).sort(sorters[sort] || sorters.relevance);
  }, [offers, params]);
  const PAGE = 12, pages = Math.max(1, Math.ceil(shown.length / PAGE)), curPage = Math.min(Math.max(1, +params.get("page") || 1), pages);
  const shopName = shop ? all.find(o => o.shopId === shop)?.shopName : "";
  const clear = () => { setQ(""); setParams({}, { replace: true }); };
  const active = cat || shop || max || params.get("q");

  return <div className="page">
    <header className="page-head"><h1>Catalogue</h1><p>Les invendus du jour, publiés par les commerces autour de l'ESSECT.</p></header>
    <div className="toolbar">
      <label className="search"><Icon name="search" /><input aria-label="Rechercher" placeholder="Produit, commerce, mot-clé…" value={q} onChange={e => setQ(e.target.value)} /></label>
      <label className="select"><span>Trier</span><select value={sort} onChange={e => set("sort", e.target.value === "relevance" ? "" : e.target.value)}>{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="select range"><span>Prix max : {max ? `${max} TND` : "illimité"}</span><input type="range" min="1" max={top} step="1" value={max || top} onChange={e => set("max", +e.target.value >= top ? "" : e.target.value)} aria-label="Prix maximum" /></label>
    </div>
    <div className="chips" role="tablist" aria-label="Catégories">
      <button className={`chip ${!cat ? "on" : ""}`} onClick={() => set("cat", "")}>Tout <b>{all.length}</b></button>
      {CATEGORIES.map(c => <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => set("cat", c)}><FoodArt category={c} className="chip-art" />{c}<b>{all.filter(o => o.category === c).length}</b></button>)}</div>
    {shop && <p className="filter-note">Offres de <b>{shopName || "ce commerce"}</b> <button className="link" onClick={() => set("shop", "")}>Voir tous les commerces</button></p>}
    <Err e={err || msg} />
    <p className="count" aria-live="polite">{offers === null ? "Chargement…" : `${shown.length} offre${shown.length > 1 ? "s" : ""}${active ? " correspondent à tes filtres" : " disponibles"}${pages > 1 ? ` · page ${curPage} sur ${pages}` : ""}`}</p>
    {offers === null ? <SkeletonGrid n={8} /> : shown.length ? <><div className="grid">{paginate(shown, curPage, PAGE).map(o => <OfferCard key={o.id} o={o} onQuick={reserve} />)}</div><Pager page={curPage} pages={pages} onChange={n => set("page", n > 1 ? String(n) : "")} /></>
      : <Empty title="Rien ne correspond" text="Essaie une autre catégorie, augmente le prix maximum ou retire un filtre.">{active && <button className="btn" onClick={clear}>Réinitialiser les filtres</button>}{!active && <Link className="btn" to="/radar">Voir les commerces près de moi</Link>}</Empty>}
  </div>;
}
