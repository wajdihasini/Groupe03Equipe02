import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Empty, Err, FavButton, Icon, OfferCard, SkeletonGrid, useFavorites, useTitle } from "../components/ui.jsx";
import { useReserve } from "../components/useReserve.js";

// Favoris : offres et commerces suivis. Les identifiants sont gardés sur cet appareil ; les données viennent du backend.
export default function Favorites({ me }) {
  useTitle("Mes favoris");
  const fav = useFavorites(me), { reserve, msg } = useReserve(me);
  const [offers, setOffers] = useState(null), [shops, setShops] = useState(null), [err, setErr] = useState("");
  useEffect(() => {
    api("/api/offers").then(setOffers).catch(x => { setErr(x.message); setOffers([]); });
    api("/api/shops").then(setShops).catch(x => { setErr(x.message); setShops([]); });
  }, []);
  const loading = offers === null || shops === null;
  const favOffers = (offers || []).filter(o => fav.offers.has(o.id));
  const favShops = (shops || []).filter(s => fav.shops.has(s.id));
  const fromShops = (offers || []).filter(o => fav.shops.has(o.shopId) && !fav.offers.has(o.id));
  const gone = loading ? 0 : fav.data.offers.length - favOffers.length + fav.data.shops.length - favShops.length;

  return <div className="page">
    <header className="page-head split-head"><div><h1>Mes favoris</h1><p>Garde un œil sur tes plats préférés et suis les commerces que tu aimes.</p></div>
      {gone > 0 && <button className="btn ghost small" onClick={() => fav.prune((offers || []).map(o => o.id), (shops || []).map(s => s.id))}>Retirer {gone} favori{gone > 1 ? "s" : ""} plus disponible{gone > 1 ? "s" : ""}</button>}</header>
    <p className="note"><Icon name="heart" size={18} />{me ? "Tes favoris sont enregistrés sur cet appareil, pour ton compte." : "Tes favoris sont enregistrés sur cet appareil. Connecte-toi pour réserver."}</p>
    <Err e={err || msg} />
    {loading ? <SkeletonGrid n={4} /> : <>
      <section className="block">
        <div className="block-head"><div><h2>Commerces suivis</h2><p>Leurs nouvelles offres apparaissent juste en dessous.</p></div></div>
        {favShops.length ? <div className="shops-row">{favShops.map(s => <div key={s.id} className="shop-chip fav-shop"><Link to={`/restaurant/${s.id}`} className="shop-chip-link"><span className="avatar" style={{ width: 46, height: 46 }}>{s.name[0]}</span><div><b>{s.name}</b><small>{s.address || "Adresse non renseignée"}</small></div></Link>
          <em>{s.offersCount || 0} offre{s.offersCount > 1 ? "s" : ""}</em><FavButton active onToggle={() => fav.shops.toggle(s.id)} label={s.name} className="fav inline" /></div>)}</div>
          : <p className="muted">Aucun commerce suivi. Ouvre la fiche d'un commerce et touche le cœur pour le suivre.</p>}
      </section>
      {fromShops.length > 0 && <section className="block"><div className="block-head"><div><h2>Nouveautés de tes commerces</h2></div></div>
        <div className="grid">{fromShops.map(o => <OfferCard key={o.id} o={o} onQuick={reserve} fav={fav.offers} />)}</div></section>}
      <section className="block">
        <div className="block-head"><div><h2>Offres favorites</h2><p>Les offres disparaissent quand le stock est épuisé ou retiré par le commerçant.</p></div></div>
        {favOffers.length ? <div className="grid">{favOffers.map(o => <OfferCard key={o.id} o={o} onQuick={reserve} fav={fav.offers} />)}</div>
          : <Empty title="Aucune offre favorite" text="Touche le cœur sur une offre du catalogue pour la retrouver ici."><Link className="btn" to="/catalog">Parcourir le catalogue</Link></Empty>}
      </section></>}
  </div>;
}
