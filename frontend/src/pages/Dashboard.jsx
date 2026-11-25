import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api.js";
import { ecoLevel } from "../config.js";
import { BarChart, Badge, Err, Icon, OfferCard, STATUS, SkeletonRows, fmt, useFavorites, useNow, useTitle } from "../components/ui.jsx";
import { useReserve } from "../components/useReserve.js";

const mmss = ms => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

// Espace étudiant : réservations en cours, favoris, niveau EcoPoints, puis les statistiques détaillées.
function StudentHome({ me, s }) {
  const [orders, setOrders] = useState(null), [offers, setOffers] = useState(null), now = useNow();
  const fav = useFavorites(me), { reserve, msg } = useReserve(me);
  useEffect(() => {
    api("/api/my/orders").then(setOrders).catch(() => setOrders([]));
    api("/api/offers").then(setOffers).catch(() => setOffers([]));
  }, []);
  const active = (orders || []).filter(o => o.status === "paid" || (o.status === "pending_payment" && (o.expiresAt || 0) > now));
  const favOffers = (offers || []).filter(o => fav.offers.has(o.id) || fav.shops.has(o.shopId)).slice(0, 4);
  const lvl = ecoLevel(s?.ecoPoints ?? me.ecoPoints ?? 0), first = me.firstName || (me.name || "").split(" ")[0];
  return <>
    <section className="dash-hero">
      <div><p className="pill"><Icon name="leaf" size={16} />Niveau {lvl.name}</p><h1>Bonjour {first} !</h1>
        <p>{active.length ? `Tu as ${active.length} réservation${active.length > 1 ? "s" : ""} en cours.` : "Aucune réservation en cours. Trouve ton prochain repas à prix réduit."}</p>
        <div className="cta-actions"><Link className="btn lemon" to="/catalog">Voir les offres</Link><Link className="btn ghost-light" to="/catalog?avail=now">Retrait possible maintenant</Link></div></div>
      <div className="dash-eco"><b>{s?.ecoPoints ?? me.ecoPoints ?? 0}</b><span>EcoPoints</span>
        <div className="meter" role="progressbar" aria-label="Progression du niveau" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(lvl.progress * 100)}><i style={{ width: `${Math.round(lvl.progress * 100)}%` }} /></div>
        <small>{lvl.next ? `${lvl.toNext} points avant ${lvl.next.name}` : "Niveau maximum atteint"}</small></div>
    </section>
    <Err e={msg} />
    <section className="block">
      <div className="block-head"><div><h2>Réservations en cours</h2><p>À payer ou à récupérer.</p></div><Link className="link" to="/orders">Tout l'historique</Link></div>
      {orders === null ? <SkeletonRows n={2} /> : active.length ? <div className="active-orders">{active.map(o => <article key={o.id} className={`order ${o.status}`}>
        <div className="order-main"><h3>{o.title} × {o.quantity}</h3><p className="muted">{fmt(o.total)} TND · <Badge s={o.status} /></p>
          {o.status === "pending_payment" ? <p className="muted">Temps restant pour payer : <strong className="countdown">{mmss(Math.max(0, o.expiresAt - now))}</strong></p> : <p className="muted">Montre ce QR code au commerçant pendant le créneau de retrait.</p>}
          <Link className="btn small" to="/orders">{o.status === "pending_payment" ? "Payer ou annuler" : "Ouvrir mes réservations"}</Link></div>
        {o.status === "paid" && o.qrToken && <div className="qr"><QRCodeSVG value={o.qrToken} size={96} /></div>}</article>)}</div>
        : <div className="panel empty-inline"><Icon name="bag" size={22} /><p>Rien en cours pour l'instant.</p><Link className="btn small" to="/catalog">Réserver un repas</Link></div>}
    </section>
    <section className="block">
      <div className="block-head"><div><h2>Tes favoris</h2><p>Offres aimées et nouveautés des commerces que tu suis.</p></div><Link className="link" to="/favorites">Tous mes favoris</Link></div>
      {offers === null ? <SkeletonRows n={1} /> : favOffers.length ? <div className="grid">{favOffers.map(o => <OfferCard key={o.id} o={o} onQuick={reserve} fav={fav.offers} />)}</div>
        : <div className="panel empty-inline"><Icon name="heart" size={22} /><p>Touche le cœur sur une offre ou un commerce pour le retrouver ici.</p><Link className="btn small ghost" to="/catalog">Parcourir</Link></div>}
    </section>
  </>;
}

export default function Dashboard({ me }) {
  useTitle(me.role === "student" ? "Mon espace" : "Statistiques");
  const [s, setS] = useState(null), [e, setE] = useState("");
  useEffect(() => { api("/api/stats").then(setS).catch(x => setE(x.message)); }, []);
  const t = v => `${fmt(v || 0)} TND`;
  const student = me.role === "student";
  const cards = !s ? [] : student
    ? [["qr", s.orders, "commandes payées"], ["bag", t(s.revenue), "dépensés"], ["trend", t(s.savings), "économisés"], ["leaf", s.mealsSaved, "repas sauvés"]]
    : me.role === "merchant"
    ? [["qr", s.orders, "commandes payées"], ["trend", t(s.revenue), "chiffre d'affaires"], ["clock", s.toCollect, "à retirer"], ["leaf", s.mealsSaved, "repas sauvés"]]
    : [["user", s.users, "utilisateurs"], ["user", `${s.students} / ${s.merchants}`, "étudiants / commerçants"], ["store", `${s.shopsApproved} / ${s.shopsPending}`, "commerces validés / en attente"],
       ["bag", s.activeOffers, "offres actives"], ["qr", s.orders, "commandes payées"], ["trend", t(s.revenue), "volume payé"], ["leaf", s.mealsSaved, "repas sauvés (gaspillage évité)"]];
  return <div className="page">
    {student && <StudentHome me={me} s={s} />}
    <header className={`page-head ${student ? "sub" : ""}`}>{student ? <h2>Mes statistiques</h2> : <h1>Statistiques</h1>}<p>{me.role === "admin" ? "Vue d'ensemble de la plateforme." : me.role === "merchant" ? "L'activité de ton commerce." : "Ton activité sur CampusSave, calculée à partir de tes commandes."}</p>
      {me.role === "merchant" && <p><Link className="link" to="/shop">Retour à mon commerce</Link></p>}</header>
    <Err e={e} />
    {!s && !e && <SkeletonRows n={2} />}
    {s && <>
      <div className="kpis">{cards.map(([ic, v, l]) => <div className="kpi" key={l}><span className="kpi-ico"><Icon name={ic} size={22} /></span><div><b>{v}</b><span>{l}</span></div></div>)}</div>
      {s.byDay && <div className="grid cols2"><BarChart data={s.byDay} k="orders" label="Commandes payées (7 derniers jours)" /><BarChart data={s.byDay} k="revenue" label="Montant payé en TND (7 derniers jours)" unit=" TND" /></div>}
      {!student && <div className="panel"><h3>Produits les plus vendus</h3>
        {s.topOffers?.length ? <ul className="rank-list">{s.topOffers.map((o, i) => <li key={o.title}><span className="rank">{i + 1}</span><div><b>{o.title}</b></div><em>{o.quantity} vendu{o.quantity > 1 ? "s" : ""}</em></li>)}</ul> : <p className="muted">Pas encore de ventes.</p>}</div>}
      {s.statusCounts && <div className="panel"><h3>Répartition des commandes</h3><p className="statuses">{Object.keys(STATUS).map(k => <span key={k} className={`badge ${k}`}>{STATUS[k]} : {s.statusCounts[k] || 0}</span>)}</p></div>}
      {me.role !== "admin" && <p><Link className="link" to="/impact">Voir l'impact environnemental détaillé</Link></p>}</>}
  </div>;
}
