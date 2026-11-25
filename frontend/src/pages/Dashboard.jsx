import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ecoLevel } from "../config.js";
import { BarChart, Badge, Err, STATUS, useTitle } from "../components/ui.jsx";

export default function Dashboard({ me }) {
  useTitle("Statistiques");
  const [s, setS] = useState(null), [e, setE] = useState("");
  useEffect(() => { api("/api/stats").then(setS).catch(x => setE(x.message)); }, []);
  if (e) return <div className="page"><Err e={e} /></div>;
  if (!s) return <div className="page"><p className="muted">Chargement…</p></div>;
  const t = v => `${v} TND`;
  const cards = me.role === "student"
    ? [[s.orders, "commandes payées"], [t(s.revenue), "dépensés"], [t(s.savings), "économisés"], [s.mealsSaved, "repas sauvés"], [`${s.ecoPoints} pts`, `EcoPoints · niveau ${ecoLevel(s.ecoPoints).name}`]]
    : me.role === "merchant"
    ? [[s.orders, "commandes payées"], [t(s.revenue), "chiffre d'affaires"], [s.toCollect, "à retirer"], [s.mealsSaved, "repas sauvés"]]
    : [[s.users, "utilisateurs"], [`${s.students} / ${s.merchants}`, "étudiants / commerçants"], [`${s.shopsApproved} / ${s.shopsPending}`, "commerces validés / en attente"],
       [s.activeOffers, "offres actives"], [s.orders, "commandes payées"], [t(s.revenue), "volume payé"], [s.mealsSaved, "repas sauvés (gaspillage évité)"]];
  return <div className="page">
    <header className="page-head"><h1>Statistiques</h1><p>{me.role === "admin" ? "Vue d'ensemble de la plateforme." : me.role === "merchant" ? "L'activité de ton commerce." : "Ton activité sur CampusSave."}</p></header>
    <div className="grid cols4">{cards.map(([v, l]) => <div className="panel stat" key={l}><h2>{v}</h2><p>{l}</p></div>)}</div>
    <div className="grid cols2"><BarChart data={s.byDay} k="orders" label="Commandes payées (7 derniers jours)" /><BarChart data={s.byDay} k="revenue" label="Montant payé en TND (7 derniers jours)" unit=" TND" /></div>
    {me.role !== "student" && <div className="panel"><h3>Produits les plus vendus</h3>
      {s.topOffers.length ? s.topOffers.map(o => <p key={o.title} className="muted">{o.title} : <strong>{o.quantity}</strong> vendu(s)</p>) : <p className="muted">Pas encore de ventes.</p>}</div>}
    <div className="panel"><h3>Répartition des commandes</h3><p className="statuses">{Object.keys(STATUS).map(k => <span key={k}><span className={`badge ${k}`}>{STATUS[k]} : {s.statusCounts[k] || 0}</span></span>)}</p></div>
    {me.role !== "admin" && <p><Link className="link" to="/impact">Voir l'impact environnemental détaillé</Link></p>}
  </div>;
}
