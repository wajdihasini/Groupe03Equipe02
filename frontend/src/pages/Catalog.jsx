import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, CATEGORIES } from "../api.js";
import { Empty, Err, FoodArt, Icon, OfferCard, Pager, SkeletonGrid, distanceKm, fmt, nowHM, paginate, pct, slotOpen, slotOver, useFavorites, useTitle } from "../components/ui.jsx";
import { useReserve } from "../components/useReserve.js";

const SORTS = { relevance: "Pertinence", popular: "Les plus demandés", new: "Nouveautés", soon: "Retrait bientôt", cheap: "Prix croissant", dear: "Prix décroissant", discount: "Plus grosse réduction", dist: "Plus proche de moi" };
const AVAIL = [["", "Toutes"], ["now", "Retrait possible maintenant"], ["later", "Plus tard aujourd'hui"], ["fav", "Mes favoris"]];
const RADII = [["", "Toutes distances"], ["1", "1 km"], ["2", "2 km"], ["5", "5 km"]];
const sorters = { relevance: (a, b) => b.sold * 2 + pct(b) / 10 - (a.sold * 2 + pct(a) / 10), popular: (a, b) => b.sold - a.sold, new: (a, b) => b.createdAt - a.createdAt, soon: (a, b) => a.pickupTo.localeCompare(b.pickupTo), cheap: (a, b) => a.price - b.price, dear: (a, b) => b.price - a.price, discount: (a, b) => pct(b) - pct(a), dist: (a, b) => (a.km ?? 1e9) - (b.km ?? 1e9) };

export default function Catalog({ me }) {
  useTitle("Catalogue");
  const [params, setParams] = useSearchParams(), { reserve, msg } = useReserve(me), fav = useFavorites(me), favOn = fav.enabled ? fav.offers : null;
  const cat = params.get("cat") || "", shop = params.get("shop") || "", max = params.get("max") || "", avail = params.get("avail") || "", radius = params.get("km") || "";
  const [offers, setOffers] = useState(null), [err, setErr] = useState(""), [q, setQ] = useState(params.get("q") || "");
  const [pos, setPos] = useState(null), [shops, setShops] = useState([]), [locating, setLocating] = useState(false);
  const sort = params.get("sort") === "dist" && !pos ? "relevance" : params.get("sort") || "relevance";
  const load = () => api("/api/offers").then(setOffers).catch(x => { setErr(x.message); setOffers([]); });
  useEffect(() => { load(); api("/api/shops").then(setShops).catch(() => {}); }, []);
  // Position réelle de l'étudiant (jamais stockée) ; les coordonnées des commerces viennent de /api/shops.
  const locate = (then) => {
    if (!navigator.geolocation) return setErr("La géolocalisation n'est pas disponible sur cet appareil.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(p => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); then?.(); },
      () => { setErr("Position refusée ou indisponible : autorise la localisation dans ton navigateur."); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000 });
  };
  const set = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); if (k !== "page") p.delete("page"); setParams(p, { replace: true }); };
  useEffect(() => { const t = setTimeout(() => { if (q !== (params.get("q") || "")) set("q", q); }, 250); return () => clearTimeout(t); }, [q]);

  const geo = useMemo(() => new Map(shops.filter(s => s.lat != null && s.lng != null).map(s => [s.id, s])), [shops]);
  const all = useMemo(() => (offers || []).map(o => { const g = geo.get(o.shopId) || (o.shopLat != null && o.shopLng != null ? { lat: o.shopLat, lng: o.shopLng } : null); return pos && g ? { ...o, km: distanceKm(pos, g) } : o; }), [offers, geo, pos]), top = Math.ceil(Math.max(10, ...all.map(o => o.price)));
  const shown = useMemo(() => {
    const s = (params.get("q") || "").toLowerCase();
    const hm = nowHM();
    const okAvail = o => !avail || (avail === "now" ? o.quantity > 0 && slotOpen(o, hm) : avail === "later" ? o.quantity > 0 && !slotOpen(o, hm) && !slotOver(o, hm) : favOn ? favOn.has(o.id) || fav.shops.has(o.shopId) : true);
    const okDist = o => !radius || !pos || (o.km != null && o.km <= +radius);
    return all.filter(o => (!cat || o.category === cat) && (!shop || o.shopId === shop) && (!max || o.price <= +max) && okAvail(o) && okDist(o) && (!s || `${o.title} ${o.shopName} ${o.category} ${o.description || ""}`.toLowerCase().includes(s))).sort((a, b) => (a.quantity <= 0) - (b.quantity <= 0) || (sorters[sort] || sorters.relevance)(a, b));
  }, [all, params, pos, fav.data]);
  const PAGE = 12, pages = Math.max(1, Math.ceil(shown.length / PAGE)), curPage = Math.min(Math.max(1, +params.get("page") || 1), pages);
  const shopName = shop ? all.find(o => o.shopId === shop)?.shopName : "";
  const clear = () => { setQ(""); setParams({}, { replace: true }); };
  const active = cat || shop || max || avail || radius || params.get("q");

  return <div className="page">
    <header className="page-head"><h1>Catalogue</h1><p>Les invendus du jour, publiés par les commerces autour de l'ESSECT.</p></header>
    <div className="toolbar">
      <label className="search"><Icon name="search" /><input aria-label="Rechercher" placeholder="Produit, commerce, mot-clé…" value={q} onChange={e => setQ(e.target.value)} /></label>
      <label className="select"><span>Trier</span><select value={sort} onChange={e => { const v = e.target.value; if (v === "dist" && !pos) return locate(() => set("sort", "dist")); set("sort", v === "relevance" ? "" : v); }}>{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      {pos ? <label className="select"><span>Distance</span><select value={radius} onChange={e => set("km", e.target.value)}>{RADII.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        : <button type="button" className="btn ghost small near-btn" onClick={() => locate(() => set("sort", "dist"))} disabled={locating}><Icon name="nav" size={16} />{locating ? "Localisation…" : "Près de moi"}</button>}
      <label className="select range"><span>Prix max : {max ? `${max} TND` : "illimité"}</span><input type="range" min="1" max={top} step="1" value={max || top} onChange={e => set("max", +e.target.value >= top ? "" : e.target.value)} aria-label="Prix maximum" /></label>
    </div>
    <div className="chips" role="tablist" aria-label="Catégories">
      <button className={`chip ${!cat ? "on" : ""}`} onClick={() => set("cat", "")}>Tout <b>{all.length}</b></button>
      {CATEGORIES.map(c => <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => set("cat", c)}><FoodArt category={c} className="chip-art" />{c}<b>{all.filter(o => o.category === c).length}</b></button>)}</div>
    <div className="chips avail" role="group" aria-label="Disponibilité">{AVAIL.filter(([k]) => k !== "fav" || favOn).map(([k, l]) => <button key={k || "all"} className={`chip ${avail === k ? "on" : ""}`} aria-pressed={avail === k} onClick={() => set("avail", k)}>{k === "now" && <i className="live-dot" aria-hidden="true" />}{l}</button>)}</div>
    {shop && <p className="filter-note">Offres de <b>{shopName || "ce commerce"}</b> <Link className="link" to={`/restaurant/${shop}`}>Fiche du commerce</Link><button className="link" onClick={() => set("shop", "")}>Voir tous les commerces</button></p>}
    <Err e={err || msg} />
    <p className="count" aria-live="polite">{offers === null ? "Chargement…" : `${shown.length} offre${shown.length > 1 ? "s" : ""}${active ? " correspondent à tes filtres" : " disponibles"}${pages > 1 ? ` · page ${curPage} sur ${pages}` : ""}`}</p>
    {offers === null ? <SkeletonGrid n={8} /> : shown.length ? <><div className="grid">{paginate(shown, curPage, PAGE).map(o => <OfferCard key={o.id} o={o} onQuick={reserve} dist={o.km} fav={favOn} />)}</div><Pager page={curPage} pages={pages} onChange={n => set("page", n > 1 ? String(n) : "")} /></>
      : <Empty title="Rien ne correspond" text="Essaie une autre catégorie, augmente le prix maximum ou retire un filtre.">{active && <button className="btn" onClick={clear}>Réinitialiser les filtres</button>}{!active && <Link className="btn" to="/radar">Voir les commerces près de moi</Link>}</Empty>}
  </div>;
}
