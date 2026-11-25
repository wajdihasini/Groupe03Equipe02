import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { CAMPUS } from "../config.js";
import RadarMap from "../components/RadarMap.jsx";
import { Empty, Err, FavButton, Icon, OfferCard, SkeletonGrid, distanceKm, fmt, fmtDist, pct, slotOpen, useFavorites, useTitle } from "../components/ui.jsx";
import { useReserve } from "../components/useReserve.js";

const SORTS = { soon: "Retrait bientôt", cheap: "Prix croissant", discount: "Plus grosse réduction", popular: "Les plus demandés" };
const sorters = { soon: (a, b) => a.pickupTo.localeCompare(b.pickupTo), cheap: (a, b) => a.price - b.price, discount: (a, b) => pct(b) - pct(a), popular: (a, b) => (b.sold || 0) - (a.sold || 0) };

// Fiche publique d'un commerce : informations (données de /api/shops) et offres du moment (données de /api/offers).
export default function Restaurant({ me }) {
  const { id } = useParams(), { reserve, msg } = useReserve(me), fav = useFavorites(me);
  const [shops, setShops] = useState(null), [offers, setOffers] = useState(null), [err, setErr] = useState(""), [sort, setSort] = useState("soon");
  useEffect(() => {
    setShops(null); setOffers(null); setErr("");
    api("/api/shops").then(setShops).catch(x => { setErr(x.message); setShops([]); });
    api("/api/offers").then(setOffers).catch(x => { setErr(x.message); setOffers([]); });
  }, [id]);
  const shop = shops?.find(s => s.id === id);
  const mine = useMemo(() => (offers || []).filter(o => o.shopId === id).sort((a, b) => (a.quantity <= 0) - (b.quantity <= 0) || sorters[sort](a, b)), [offers, id, sort]);
  // Si le commerce n'est pas dans /api/shops (ex. pas encore validé) mais a des offres, on affiche ce que les offres indiquent.
  const name = shop?.name || mine[0]?.shopName, address = shop?.address || mine[0]?.shopAddress;
  const lat = shop?.lat ?? mine[0]?.shopLat, lng = shop?.lng ?? mine[0]?.shopLng, hasGeo = lat != null && lng != null;
  useTitle(name || "Commerce");

  if (shops === null || offers === null) return <div className="page"><div className="resto-hero skeleton"><i /><i /></div><SkeletonGrid n={4} /></div>;
  if (!name) return <div className="page"><Err e={err} /><Empty title="Commerce introuvable" text="Ce commerce n'existe pas ou n'est pas encore validé par l'équipe CampusSave."><Link className="btn" to="/radar">Voir tous les commerces</Link></Empty></div>;

  const open = mine.filter(o => o.quantity > 0 && slotOpen(o)).length;
  const best = mine.length ? Math.max(...mine.map(pct)) : 0;
  const from = mine.length ? Math.min(...mine.map(o => o.price)) : 0;
  const km = hasGeo ? distanceKm(CAMPUS, { lat, lng }) : null;

  return <div className="page">
    <nav className="crumbs" aria-label="Fil d'Ariane"><Link to="/radar">Restaurants</Link><span>/</span><b>{name}</b></nav>
    <section className="resto-hero">
      <div className="resto-id"><span className="resto-avatar" aria-hidden="true">{name[0]?.toUpperCase()}</span>
        <div><h1>{name}</h1>
          <p className="resto-addr"><Icon name="pin" size={16} />{address || "Adresse non renseignée"}{km != null && <span className="chip-mini">{fmtDist(km)} du campus</span>}</p>
          {shop?.description && <p className="resto-desc">{shop.description}</p>}
          {shop?.phone && <p className="resto-addr"><Icon name="phone" size={16} /><a href={`tel:${shop.phone.replace(/\s/g, "")}`}>{shop.phone}</a></p>}</div>
        {fav.enabled && <FavButton className="fav big" active={fav.shops.has(id)} onToggle={() => fav.shops.toggle(id)} label={name} />}</div>
      <ul className="resto-stats">
        <li><b>{mine.length}</b><span>offre{mine.length > 1 ? "s" : ""} en ligne</span></li>
        <li><b>{open}</b><span>retrait possible maintenant</span></li>
        {mine.length > 0 && <li><b>{fmt(from)} TND</b><span>à partir de</span></li>}
        {best > 0 && <li><b>-{best}%</b><span>meilleure réduction</span></li>}
      </ul>
      <div className="cta-actions">{hasGeo && <a className="btn lemon" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer"><Icon name="nav" size={18} />Itinéraire</a>}
        <Link className="btn ghost-light" to="/radar"><Icon name="pin" size={18} />Voir sur la carte</Link></div>
    </section>
    <Err e={err || msg} />
    <div className="resto-body">
      <section className="resto-offers">
        <div className="block-head"><div><h2>Offres du moment</h2><p>Invendus publiés par ce commerce, à réserver puis récupérer sur place.</p></div>
          {mine.length > 1 && <label className="select"><span>Trier</span><select value={sort} onChange={e => setSort(e.target.value)}>{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>}</div>
        {mine.length ? <div className="grid">{mine.map(o => <OfferCard key={o.id} o={o} onQuick={reserve} fav={fav.enabled ? fav.offers : null} />)}</div>
          : <Empty title="Pas d'offre en ce moment" text={`${name} n'a rien publié pour l'instant. Les invendus arrivent souvent en fin de journée.`}>{fav.enabled && !fav.shops.has(id) && <button className="btn" onClick={() => fav.shops.toggle(id)}><Icon name="heart" size={18} />Suivre ce commerce</button>}<Link className="btn ghost" to="/catalog">Voir tout le catalogue</Link></Empty>}
      </section>
      {hasGeo && <aside className="resto-map"><RadarMap center={{ lat, lng }} shops={[{ id, name, lat, lng, offersCount: mine.length }]} selectedId={id} zoom={16} /><small className="muted">Carte OpenStreetMap · position indiquée par le commerçant.</small></aside>}
    </div>
  </div>;
}
