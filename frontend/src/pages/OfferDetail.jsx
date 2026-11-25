import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Empty, Err, FavButton, Icon, OfferCard, OfferVisual, Section, fmt, isBasket, isNew, isWikimedia, pct, slotOpen, slotOver, useFavorites, useTitle } from "../components/ui.jsx";
import { useReserve } from "../components/useReserve.js";

export default function OfferDetail({ me }) {
  const { id } = useParams(), { reserve, msg } = useReserve(me), fav = useFavorites(me), favOn = fav.enabled ? fav.offers : null;
  const [zoom, setZoom] = useState(false), [o, setO] = useState(null), [others, setOthers] = useState([]), [qty, setQty] = useState(1), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useTitle(o?.title);
  useEffect(() => { const on = !!o && (!me || me.role === "student"); document.body.classList.toggle("has-buybar", on); return () => document.body.classList.remove("has-buybar"); }, [o?.id, me?.role]); // la barre de réservation remplace la navigation du bas
  useEffect(() => { if (!zoom) return; const f = (e) => e.key === "Escape" && setZoom(false); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [zoom]);
  useEffect(() => {
    setO(null); setErr(""); setQty(1); window.scrollTo({ top: 0 });
    api(`/api/offers/${id}`).then(setO).catch(x => setErr(x.message));
    api("/api/offers").then(setOthers).catch(() => {});
  }, [id]);
  if (err) return <div className="page"><Empty title="Offre introuvable" text={err}><Link className="btn" to="/catalog">Retour au catalogue</Link></Empty></div>;
  if (!o) return <div className="page"><div className="detail skeleton"><div className="detail-media" /><div className="detail-info"><i /><i /><i /></div></div></div>;

  const maxQ = Math.max(1, Math.min(10, o.quantity)), q = Math.min(qty, maxQ), soldOut = o.quantity <= 0, student = !me || me.role === "student";
  const sameShop = others.filter(x => x.shopId === o.shopId && x.id !== o.id).slice(0, 4);
  const similar = others.filter(x => x.category === o.category && x.id !== o.id && x.shopId !== o.shopId).slice(0, 4);
  const hasGeo = o.shopLat != null && o.shopLng != null;
  const go = async () => { setBusy(true); const ok = await reserve(o, q); if (!ok) setBusy(false); };

  return <div className="page">
    <nav className="crumbs" aria-label="Fil d'Ariane"><Link to="/catalog">Catalogue</Link><span>/</span><Link to={`/catalog?cat=${encodeURIComponent(o.category)}`}>{o.category}</Link><span>/</span><b>{o.title}</b></nav>
    <div className="detail">
      <div className={`detail-media ${o.photo ? "zoomable" : ""}`} {...(o.photo ? { role: "button", tabIndex: 0, "aria-label": "Agrandir la photo", onClick: () => setZoom(true), onKeyDown: (e) => e.key === "Enter" && setZoom(true) } : {})}><OfferVisual o={o} /><span className="sticker big">-{pct(o)}%</span>
        <span className="ticket-badges">{isBasket(o) && <em className="tag basket">Surprise</em>}{isNew(o) && <em className="tag new">Nouveau</em>}{o.sold >= 3 && <em className="tag hot">Populaire</em>}</span></div>
      <div className="detail-info">
        <Link className="chip on static" to={`/catalog?cat=${encodeURIComponent(o.category)}`}>{o.category}</Link>
        <div className="detail-title"><h1>{o.title}</h1>{favOn && <FavButton className="fav big" active={favOn.has(o.id)} onToggle={() => favOn.toggle(o.id)} label={o.title} />}</div>
        <p className="detail-shop"><Icon name="store" size={18} /><Link to={`/restaurant/${o.shopId}`}>{o.shopName}</Link>{o.shopAddress && <span>{o.shopAddress}</span>}</p>
        <p className="detail-desc">{o.description || (isBasket(o) ? "Le contenu est une surprise : le commerçant y met ses invendus du jour." : "Invendu du jour proposé à prix réduit par le commerçant.")}</p>
        {isBasket(o) && <p className="note"><Icon name="gift" size={18} />Contenu révélé au retrait. Valeur annoncée : au moins {fmt(o.originalPrice)} TND.</p>}
        <div className="detail-price"><s>{fmt(o.originalPrice)} TND</s><b>{fmt(o.price)}<small> TND</small></b><span>Tu économises {fmt(o.originalPrice - o.price)} TND</span></div>
        <ul className="facts">
          <li><Icon name="clock" /><div><b>Retrait</b><span>{o.pickupFrom} à {o.pickupTo}{slotOpen(o) ? " · en cours" : slotOver(o) ? " · terminé aujourd'hui" : ""}</span></div></li>
          <li><Icon name="bag" /><div><b>Stock</b><span>{soldOut ? "Épuisé" : o.quantity <= 3 ? `Plus que ${o.quantity}` : `${o.quantity} disponibles`}</span></div></li>
          <li><Icon name="trend" /><div><b>Demande</b><span>{o.sold ? `${o.sold} déjà réservé${o.sold > 1 ? "s" : ""}` : "Nouvelle offre"}</span></div></li></ul>
        <Err e={msg} />
        {student ? <div className="buy">
          <div className="stepper" role="group" aria-label="Quantité"><button onClick={() => setQty(Math.max(1, q - 1))} disabled={q <= 1} aria-label="Moins"><Icon name="minus" size={16} /></button><output aria-live="polite">{q}</output><button onClick={() => setQty(Math.min(maxQ, q + 1))} disabled={q >= maxQ} aria-label="Plus"><Icon name="plus" size={16} /></button></div>
          <button className="btn lg" onClick={go} disabled={soldOut || busy}>{soldOut ? "Épuisé" : `Réserver · ${fmt(o.price * q)} TND`}</button></div>
          : <p className="note">Connecté en tant que {me.role === "merchant" ? "commerçant" : "administrateur"} : seuls les étudiants peuvent réserver.</p>}
        <p className="fine"><Icon name="shield" size={16} />Après la réservation, tu as 15 minutes pour payer. Passé ce délai, le stock est remis en vente.</p>
        <p className="fine"><Icon name="store" size={16} /><Link to={`/restaurant/${o.shopId}`}>Voir la fiche du commerce et ses autres offres</Link></p>
        {hasGeo && <p className="fine"><Icon name="pin" size={16} /><Link to="/radar">Voir sur le Campus Radar</Link><a href={`https://www.google.com/maps/dir/?api=1&destination=${o.shopLat},${o.shopLng}`} target="_blank" rel="noopener noreferrer">Itinéraire</a></p>}
        {isWikimedia(o.photo) && <p className="fine"><Icon name="cam" size={16} />Photo : {o.photoCredit || "auteur indiqué sur la page source"}, via {String(o.photoSource || "").startsWith("https://commons.wikimedia.org/") ? <a href={o.photoSource} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> : "Wikimedia Commons"}</p>}
      </div></div>
    {student && !soldOut && <div className="buybar"><div><b>{fmt(o.price * q)} TND</b><small>{q} × {fmt(o.price)} TND</small></div><button className="btn" onClick={go} disabled={busy}>Réserver</button></div>}
    {zoom && <div className="lightbox" role="dialog" aria-modal="true" aria-label={o.title} onClick={() => setZoom(false)}><button className="lightbox-close" aria-label="Fermer">×</button><img src={o.photo} alt={o.title} /></div>}
    {sameShop.length > 0 && <Section title={`Aussi chez ${o.shopName}`}><div className="grid">{sameShop.map(x => <OfferCard key={x.id} o={x} fav={favOn} />)}</div></Section>}
    {similar.length > 0 && <Section title="Dans la même catégorie"><div className="grid">{similar.map(x => <OfferCard key={x.id} o={x} fav={favOn} />)}</div></Section>}
  </div>;
}
