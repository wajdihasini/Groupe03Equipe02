import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { CAMPUS } from "../config.js";
import RadarMap from "../components/RadarMap.jsx";
import { Empty, Err, Icon, distanceKm, fmtDist, useTitle } from "../components/ui.jsx";

const RADII = [[0.5, "500 m"], [1, "1 km"], [2, "2 km"], [5, "5 km"], [0, "Tous"]];

// Bonus Campus Radar : commerces validés autour du campus ou de la position réelle de l'étudiant.
export default function Radar() {
  useTitle("Campus Radar");
  const [shops, setShops] = useState(null), [err, setErr] = useState(""), [user, setUser] = useState(null), [radius, setRadius] = useState(2), [sel, setSel] = useState(null), [locating, setLocating] = useState(false);
  useEffect(() => { api("/api/shops").then(setShops).catch(x => { setErr(x.message); setShops([]); }); }, []);
  const origin = user || CAMPUS;
  const locate = () => {
    if (!navigator.geolocation) return setErr("La géolocalisation n'est pas disponible sur cet appareil.");
    setErr(""); setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setUser({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { setErr("Position refusée ou indisponible. Autorise la localisation dans ton navigateur, ou regarde autour du campus."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 });
  };
  const { near, unknown } = useMemo(() => {
    const all = shops || [];
    const placed = all.filter(s => s.lat != null && s.lng != null).map(s => ({ ...s, km: distanceKm(origin, s) })).sort((a, b) => a.km - b.km);
    return { near: placed.filter(s => !radius || s.km <= radius), unknown: all.filter(s => s.lat == null || s.lng == null) };
  }, [shops, user, radius]);

  return <div className="page">
    <header className="page-head"><h1>Campus Radar</h1><p>Les restaurants et cafétérias partenaires {user ? "autour de ta position" : "autour du campus"}, avec leurs offres du moment.</p></header>
    <div className="radar-bar">
      <div className="chips">{RADII.map(([r, l]) => <button key={l} className={`chip ${radius === r ? "on" : ""}`} onClick={() => setRadius(r)}>{l}</button>)}</div>
      {user ? <button className="btn ghost small" onClick={() => setUser(null)}>Revenir au campus</button> : <button className="btn small" onClick={locate} disabled={locating}><Icon name="nav" size={16} />{locating ? "Localisation…" : "Me localiser"}</button>}
    </div>
    <Err e={err} />
    <div className="radar">
      <aside className="radar-list" aria-label="Commerces">
        {shops === null && <p className="muted">Chargement des commerces…</p>}
        {shops && !near.length && <Empty title="Aucun commerce dans ce rayon" text="Élargis le rayon de recherche pour voir plus de commerces." />}
        {near.map(s => <article key={s.id} className={`shop ${sel === s.id ? "on" : ""}`}>
          <button className="shop-main" onClick={() => setSel(s.id)} aria-pressed={sel === s.id}>
            <span className="shop-dist">{fmtDist(s.km)}</span><h3>{s.name}</h3><p>{s.address || "Adresse non renseignée"}</p>
            {s.description && <p className="shop-desc">{s.description}</p>}</button>
          <div className="shop-actions"><span className={`badge ${s.offersCount ? "ok" : ""}`}>{s.offersCount ? `${s.offersCount} offre${s.offersCount > 1 ? "s" : ""}` : "Aucune offre"}</span>
            <span><Link className="btn small" to={`/catalog?shop=${s.id}`}>Voir les offres</Link>{" "}<a className="btn small ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer">Itinéraire</a></span></div>
        </article>)}
        {unknown.length > 0 && <div className="shop-unknown"><h4>Position non renseignée</h4>{unknown.map(s => <p key={s.id}><Link to={`/catalog?shop=${s.id}`}>{s.name}</Link><small>{s.offersCount} offre(s)</small></p>)}</div>}
      </aside>
      <div className="radar-mapbox"><RadarMap center={origin} shops={near} user={user} radiusKm={user ? radius : 0} selectedId={sel} onSelect={setSel} />
        <small className="muted">Clique sur la carte puis utilise la molette pour zoomer. {user ? "Le point bleu indique ta position." : "Active « Me localiser » pour trier par distance à partir de toi."}</small></div>
    </div></div>;
}
