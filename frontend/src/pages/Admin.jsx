import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { api, CATEGORIES } from "../api.js";
import { Avatar, BarChart, Badge, Empty, Err, Icon, Pager, ROLE, STATUS, fmt, paginate, useTitle } from "../components/ui.jsx";

const when = (t) => t ? new Date(t).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const csv = (rows, cols) => [cols.map(c => c.h), ...rows.map(r => cols.map(c => c.v(r)))].map(l => l.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
const download = (name, text) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
const ORDER_COLS = [{ h: "Date", v: o => when(o.createdAt) }, { h: "Produit", v: o => o.title }, { h: "Quantité", v: o => o.quantity }, { h: "Total (TND)", v: o => o.total }, { h: "Statut", v: o => STATUS[o.status] || o.status }, { h: "Étudiant", v: o => o.studentName }, { h: "Commerce", v: o => o.shopName }];

// Liste filtrable et paginée : recherche + filtre + tableau + pagination.
function List({ rows, search, filters, cols, size = 10, empty, toolbar }) {
  const [q, setQ] = useState(""), [f, setF] = useState(""), [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q, f]);
  const shown = useMemo(() => rows.filter(r => (!q || search(r).toLowerCase().includes(q.toLowerCase())) && (!f || filters.test(r, f))), [rows, q, f]);
  const pages = Math.max(1, Math.ceil(shown.length / size)), cur = Math.min(page, pages);
  return <><div className="toolbar"><label className="search"><Icon name="search" /><input aria-label="Rechercher" placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} /></label>
    {filters && <label className="select"><span>{filters.label}</span><select value={f} onChange={e => setF(e.target.value)}><option value="">Tous</option>{filters.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>}{toolbar}</div>
    <p className="count">{shown.length} résultat{shown.length > 1 ? "s" : ""}</p>
    {shown.length ? <div className="panel table-wrap flush"><table className="data"><thead><tr>{cols.map(c => <th key={c.h}>{c.h}</th>)}</tr></thead>
      <tbody>{paginate(shown, cur, size).map((r, i) => <tr key={r.id || i}>{cols.map(c => <td key={c.h} data-label={c.h}>{c.r(r)}</td>)}</tr>)}</tbody></table></div> : empty}
    <Pager page={cur} pages={pages} onChange={setPage} /></>;
}
const useData = (url) => { const [d, setD] = useState(null), [e, setE] = useState(""); const load = () => api(url).then(setD).catch(x => setE(x.message)); useEffect(() => { load(); }, [url]); return [d, e, load, setE]; };
const Stat = ({ icon, v, l, sub, tone = "" }) => <div className={`kpi ${tone}`}><span className="kpi-ico"><Icon name={icon} size={22} /></span><div><b>{v}</b><span>{l}</span>{sub && <small>{sub}</small>}</div></div>;

function Overview() {
  useTitle("Espace admin");
  const [d, e, load, setE] = useData("/api/admin/overview"), [busy, setBusy] = useState("");
  const approve = async (s) => { setBusy(s.id); try { await api(`/api/admin/shops/${s.id}`, { method: "PATCH", body: { approved: true } }); await load(); } catch (x) { setE(x.message); } setBusy(""); };
  const exportOrders = async () => { try { const o = await api("/api/admin/orders"); download(`commandes-campussave-${new Date().toISOString().slice(0, 10)}.csv`, csv(o, ORDER_COLS)); } catch (x) { setE(x.message); } };
  if (e) return <Err e={e} />;
  if (!d) return <p className="muted">Chargement du tableau de bord…</p>;
  const k = d.kpis, max = Math.max(1, ...d.topShops.map(s => s.revenue));
  return <>
    <header className="page-head split-head"><div><h1>Tableau de bord</h1><p>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · vue d'ensemble de la plateforme.</p></div>
      <button className="btn ghost" onClick={exportOrders}><Icon name="chart" size={18} />Exporter les commandes (CSV)</button></header>
    {k.shopsPending > 0 && <section className="alert"><div className="alert-head"><Icon name="shield" size={22} /><div><b>{k.shopsPending} commerce{k.shopsPending > 1 ? "s" : ""} en attente de validation</b><span>Un commerce validé peut publier des offres visibles par les étudiants.</span></div><Link className="btn small ghost" to="/admin/shops">Tout voir</Link></div>
      <ul>{d.pendingShops.slice(0, 4).map(s => <li key={s.id}><div><b>{s.name}</b><small>{s.address || "Adresse non renseignée"} · inscrit {when(s.createdAt)}</small></div><button className="btn small" disabled={busy === s.id} onClick={() => approve(s)}>Valider</button></li>)}</ul></section>}
    <div className="kpis">
      <Stat icon="user" v={k.users} l="utilisateurs" sub={`${k.students} étudiants · ${k.merchants} commerçants${k.blocked ? ` · ${k.blocked} bloqué(s)` : ""}`} />
      <Stat icon="store" v={k.shopsApproved} l="commerces validés" sub={`${k.shopsPending} en attente`} tone={k.shopsPending ? "warn" : ""} />
      <Stat icon="bag" v={k.offersActive} l="offres actives" sub={`${k.offersTotal} au total`} />
      <Stat icon="qr" v={k.ordersToday} l="commandes aujourd'hui" sub={`${k.ordersTotal} au total · ${k.toCollect} à retirer`} />
      <Stat icon="trend" v={`${fmt(k.revenue)} TND`} l="volume payé" tone="ok" />
      <Stat icon="leaf" v={k.meals} l="repas sauvés" sub={`${fmt(k.savings)} TND économisés`} tone="ok" /></div>
    <div className="grid cols2"><BarChart data={d.byDay} k="orders" label="Commandes payées (14 jours)" /><BarChart data={d.byDay} k="revenue" label="Montant payé en TND (14 jours)" unit=" TND" /></div>
    <div className="grid cols2">
      <section className="panel"><div className="panel-head"><h3>Commandes récentes</h3><Link className="link" to="/admin/orders">Voir tout</Link></div>
        {d.recentOrders.length ? <ul className="feed">{d.recentOrders.map(o => <li key={o.id}><div><b>{o.title} × {o.quantity}</b><small>{o.studentName || "Étudiant"} · {o.shopName} · {when(o.createdAt)}</small></div><span><b>{fmt(o.total)} TND</b><Badge s={o.status} /></span></li>)}</ul> : <p className="muted">Aucune commande pour le moment.</p>}</section>
      <section className="panel"><div className="panel-head"><h3>Nouveaux inscrits</h3><Link className="link" to="/admin/users">Voir tout</Link></div>
        <ul className="feed">{d.recentUsers.map(u => <li key={u.id}><div className="who"><Avatar name={u.name} size={34} /><div><b>{u.name}</b><small>{u.email}</small></div></div><span className="badge">{ROLE[u.role]}</span></li>)}</ul></section></div>
    <div className="grid cols2">
      <section className="panel"><h3>Meilleurs commerces</h3>{d.topShops.length ? <ul className="rank-list">{d.topShops.map((s, i) => <li key={s.id}><span className="rank">{i + 1}</span><div><b>{s.name}</b><span className="meter"><i style={{ width: `${(s.revenue / max) * 100}%` }} /></span></div><em>{fmt(s.revenue)} TND</em></li>)}</ul> : <p className="muted">Pas encore de ventes.</p>}</section>
      <section className="panel"><h3>Répartition des commandes</h3><p className="statuses">{Object.keys(STATUS).map(s => <span key={s} className={`badge ${s}`}>{STATUS[s]} : {d.statusCounts[s] || 0}</span>)}</p>
        <h3 className="mt">Accès rapides</h3><div className="quick"><Link className="btn small ghost" to="/admin/shops">Valider les commerces</Link><Link className="btn small ghost" to="/admin/users">Gérer les comptes</Link><Link className="btn small ghost" to="/admin/offers">Modérer les offres</Link><Link className="btn small ghost" to="/dashboard">Statistiques détaillées</Link></div></section></div></>;
}

function Shops() {
  useTitle("Commerces");
  const [rows, e, load, setE] = useData("/api/admin/shops");
  const toggle = async (s) => { try { await api(`/api/admin/shops/${s.id}`, { method: "PATCH", body: { approved: !s.approved } }); load(); } catch (x) { setE(x.message); } };
  return <><header className="page-head"><h1>Commerces</h1><p>Valide les nouveaux commerces et suspends ceux qui ne respectent pas les règles.</p></header><Err e={e} />
    {rows && <List rows={rows} search={s => `${s.name} ${s.address} ${s.phone}`} filters={{ label: "Statut", options: [["ok", "Validés"], ["wait", "En attente"]], test: (s, f) => (f === "ok") === !!s.approved }}
      empty={<Empty title="Aucun commerce" text="Les commerçants apparaissent ici dès leur inscription." />}
      cols={[{ h: "Commerce", r: s => <><b>{s.name}</b><small className="sub-cell">{s.address || "Adresse non renseignée"}</small></> }, { h: "Téléphone", r: s => s.phone || "—" }, { h: "Position", r: s => s.lat != null ? "Sur la carte" : "Non renseignée" },
        { h: "Inscrit le", r: s => when(s.createdAt) }, { h: "Statut", r: s => <span className={`badge ${s.approved ? "ok" : "wait"}`}>{s.approved ? "Validé" : "En attente"}</span> },
        { h: "", r: s => <button className={`btn small ${s.approved ? "ghost" : ""}`} onClick={() => toggle(s)}>{s.approved ? "Suspendre" : "Valider"}</button> }]} />}</>;
}

function Users() {
  useTitle("Utilisateurs");
  const [rows, e, load, setE] = useData("/api/admin/users");
  const toggle = async (u) => { try { await api(`/api/admin/users/${u.id}`, { method: "PATCH", body: { blocked: !u.blocked } }); load(); } catch (x) { setE(x.message); } };
  return <><header className="page-head"><h1>Utilisateurs</h1><p>Consulte les comptes et bloque l'accès en cas d'abus.</p></header><Err e={e} />
    {rows && <List rows={rows} search={u => `${u.name} ${u.email} ${u.phone || ""}`} filters={{ label: "Rôle", options: Object.entries(ROLE), test: (u, f) => u.role === f }}
      empty={<Empty title="Aucun utilisateur" text="Aucun compte ne correspond à la recherche." />}
      cols={[{ h: "Utilisateur", r: u => <div className="who"><Avatar name={u.name} size={34} /><div><b>{u.name}</b><small className="sub-cell">{u.email}</small></div></div> }, { h: "Téléphone", r: u => u.phone || "—" }, { h: "Rôle", r: u => ROLE[u.role] },
        { h: "Inscrit le", r: u => when(u.createdAt) }, { h: "Statut", r: u => <span className={`badge ${u.blocked ? "blocked" : "ok"}`}>{u.blocked ? "Bloqué" : "Actif"}</span> },
        { h: "", r: u => u.role !== "admin" && <button className="btn small ghost" onClick={() => toggle(u)}>{u.blocked ? "Débloquer" : "Bloquer"}</button> }]} />}</>;
}

function Orders() {
  useTitle("Commandes");
  const [rows, e] = useData("/api/admin/orders");
  return <><header className="page-head"><h1>Commandes</h1><p>Toutes les commandes de la plateforme (500 dernières).</p></header><Err e={e} />
    {rows && <List rows={rows} search={o => `${o.title} ${o.studentName || ""} ${o.shopName}`} filters={{ label: "Statut", options: Object.entries(STATUS), test: (o, f) => o.status === f }}
      toolbar={<button className="btn ghost small" onClick={() => download("commandes-campussave.csv", csv(rows, ORDER_COLS))}>Exporter en CSV</button>}
      empty={<Empty title="Aucune commande" text="Les commandes apparaîtront ici dès la première réservation." />}
      cols={[{ h: "Date", r: o => when(o.createdAt) }, { h: "Produit", r: o => <b>{o.title} × {o.quantity}</b> }, { h: "Étudiant", r: o => o.studentName || "—" }, { h: "Commerce", r: o => o.shopName },
        { h: "Total", r: o => `${fmt(o.total)} TND` }, { h: "Statut", r: o => <Badge s={o.status} /> }]} />}</>;
}

function Offers() {
  useTitle("Offres");
  const [rows, e, load, setE] = useData("/api/admin/offers");
  const del = async (o) => { if (!window.confirm(`Supprimer l'offre « ${o.title} » de ${o.shopName} ?`)) return; try { await api(`/api/admin/offers/${o.id}`, { method: "DELETE" }); load(); } catch (x) { setE(x.message); } };
  return <><header className="page-head"><h1>Offres</h1><p>Modère le catalogue : supprime les offres inappropriées ou erronées.</p></header><Err e={e} />
    {rows && <List rows={rows} search={o => `${o.title} ${o.shopName} ${o.category}`} filters={{ label: "Catégorie", options: CATEGORIES.map(c => [c, c]), test: (o, f) => o.category === f }}
      empty={<Empty title="Aucune offre" text="Aucune offre ne correspond à la recherche." />}
      cols={[{ h: "Offre", r: o => <><b>{o.title}</b><small className="sub-cell">{o.category}</small></> }, { h: "Commerce", r: o => o.shopName }, { h: "Prix", r: o => `${fmt(o.price)} TND` },
        { h: "Stock", r: o => o.quantity > 0 ? o.quantity : <span className="badge expired">Épuisée</span> }, { h: "Retrait", r: o => `${o.pickupFrom}–${o.pickupTo}` }, { h: "Publiée", r: o => when(o.createdAt) },
        { h: "", r: o => <button className="btn small ghost danger-btn" onClick={() => del(o)}>Supprimer</button> }]} />}</>;
}

export default function Admin() {
  const [pending, setPending] = useState(0);
  useEffect(() => { api("/api/admin/overview").then(d => setPending(d.kpis.shopsPending)).catch(() => {}); }, []);
  const items = [["/admin", "Tableau de bord", "chart", true], ["/admin/shops", "Commerces", "store"], ["/admin/users", "Utilisateurs", "user"], ["/admin/orders", "Commandes", "qr"], ["/admin/offers", "Offres", "bag"], ["/dashboard", "Statistiques", "trend"]];
  return <div className="admin">
    <aside className="admin-nav" aria-label="Navigation administration"><p className="admin-title"><Icon name="shield" size={18} />Administration</p>
      {items.map(([to, l, ic, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}><Icon name={ic} size={18} />{l}{to === "/admin/shops" && pending > 0 && <em className="dot">{pending}</em>}</NavLink>)}</aside>
    <div className="admin-main"><Routes><Route index element={<Overview />} /><Route path="shops" element={<Shops />} /><Route path="users" element={<Users />} /><Route path="orders" element={<Orders />} /><Route path="offers" element={<Offers />} /></Routes></div></div>;
}
