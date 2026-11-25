import { useEffect, useRef, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { QRCodeSVG } from "qrcode.react";
import { fb, api, enableNotifications, notificationsAvailable } from "./api.js";
import { Err, Badge, Empty, Icon, Pager, STATUS, paginate, useNow, useTitle, Header, Footer, BottomNav, Toaster, Forbidden, SkeletonRows, toast } from "./components/ui.jsx";
import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import OfferDetail from "./pages/OfferDetail.jsx";
import Radar from "./pages/Radar.jsx";
import Impact from "./pages/Impact.jsx";
import Login from "./pages/Login.jsx";
import Merchant from "./pages/Merchant.jsx";
import Admin from "./pages/Admin.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import About from "./pages/About.jsx";
import Partners from "./pages/Partners.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Restaurant from "./pages/Restaurant.jsx";
import Contact from "./pages/Contact.jsx";
import FaqPage from "./pages/Faq.jsx";
import Favorites from "./pages/Favorites.jsx";

// ---------- Commandes ----------
function Orders({ me }) {
  useTitle(me.role === "merchant" ? "Commandes reçues" : "Mes réservations");
  const [data, setData] = useState(null), [e, setE] = useState(""), [filter, setFilter] = useState(""), [page, setPage] = useState(1), now = useNow();
  const list = data || [];
  const load = () => api("/api/my/orders").then(d => { setData(d); setE(""); }).catch(x => { setE(x.message); setData(d => d || []); });
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);
  const pay = async o => { try { const { payUrl } = await api(`/api/orders/${o.id}/pay`, { method: "POST" }); window.location = payUrl; } catch (x) { setE(x.message); load(); } };
  const cancel = async o => { if (!window.confirm("Annuler cette réservation ?")) return; try { await api(`/api/orders/${o.id}/cancel`, { method: "POST" }); load(); } catch (x) { setE(x.message); } };
  const shown = list.filter(o => !filter || o.status === filter);
  const left = o => Math.max(0, (o.expiresAt || 0) - now);
  const mmss = ms => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
  const count = s => list.filter(o => o.status === s).length, PAGE = 6, pages = Math.max(1, Math.ceil(shown.length / PAGE)), cur = Math.min(page, pages);
  const date = t => t ? new Date(t).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const tiles = me.role === "merchant" ? [["À retirer", count("paid"), "qr"], ["Retirées", count("collected"), "check"], ["Total", list.length, "bag"]] : [["À payer", list.filter(o => o.status === "pending_payment" && left(o) > 0).length, "bolt"], ["À retirer", count("paid"), "qr"], ["Retirées", count("collected"), "check"]];
  return <section>
    <header className="page-head"><h1>{me.role === "merchant" ? "Commandes reçues" : "Mes réservations"}</h1><p>{me.role === "merchant" ? "Suis les commandes de ton commerce et valide les retraits depuis « Mon commerce »." : "Paie tes réservations, retrouve ton QR code et suis tes retraits."}</p></header>
    <div className="order-tiles">{tiles.map(([l, v, ic]) => <div className="kpi" key={l}><span className="kpi-ico"><Icon name={ic} size={22} /></span><div><b>{v}</b><span>{l}</span></div></div>)}</div>
    <div className="chips"><button className={`chip ${!filter ? "on" : ""}`} onClick={() => { setFilter(""); setPage(1); }}>Toutes <b>{list.length}</b></button>
      {Object.entries(STATUS).map(([k, v]) => <button key={k} className={`chip ${filter === k ? "on" : ""}`} onClick={() => { setFilter(k); setPage(1); }}>{v} <b>{count(k)}</b></button>)}</div>
    <Err e={e} />
    {data === null && <SkeletonRows n={3} />}
    {paginate(shown, cur, PAGE).map(o => <article className={`order ${o.status}`} key={o.id}>
      <div className="order-main"><h3>{o.title} × {o.quantity}</h3>
        <p className="muted">{o.total} TND · <Badge s={o.status === "pending_payment" && !left(o) ? "expired" : o.status} />{me.role === "merchant" && o.studentName ? ` · ${o.studentName}` : ""}</p>
        <p className="muted order-date">Réservée le {date(o.createdAt)}{o.collectedAt ? ` · retirée le ${date(o.collectedAt)}` : ""}</p>
        {me.role === "student" && o.status === "pending_payment" && left(o) > 0 && <>
          <p className="muted">Temps restant pour payer : <strong className="countdown">{mmss(left(o))}</strong></p>
          <button className="btn small" onClick={() => pay(o)}>Payer maintenant</button>{" "}
          <button className="btn small ghost" onClick={() => cancel(o)}>Annuler</button></>}
        {me.role === "student" && o.status === "paid" && <p className="note"><Icon name="qr" size={18} />Présente ce QR code au commerçant pendant le créneau de retrait.</p>}
        {me.role === "merchant" && o.status === "paid" && <Link className="btn small ghost" to="/shop"><Icon name="qr" size={16} />Valider le retrait (scan du QR)</Link>}
      </div>
      {o.qrToken && o.status === "paid" && <div className="qr"><QRCodeSVG value={o.qrToken} size={132} /><small>{o.qrToken}</small></div>}
    </article>)}
    {data !== null && !shown.length && <Empty title={filter ? "Aucune commande avec ce statut" : "Aucune commande pour l'instant"} text={me.role === "merchant" ? "Les commandes de tes clients apparaîtront ici." : "Réserve ton premier repas dans le catalogue."}>{me.role === "student" && <Link className="btn" to="/catalog">Voir le catalogue</Link>}</Empty>}
    <Pager page={cur} pages={pages} onChange={setPage} /></section>;
}

// ---------- Passerelle de paiement simulée (PAYMENT_PROVIDER=mock côté backend) ----------
function MockPay() {
  const { id } = useParams(), nav = useNavigate();
  const [o, setO] = useState(null), [e, setE] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/my/orders").then(l => setO(l.find(x => x.id === id) || false)).catch(x => setE(x.message)); }, [id]);
  const pay = async () => { setBusy(true); try { await api(`/api/orders/${id}/mock-pay`, { method: "POST" }); nav("/orders"); } catch (x) { setE(x.message); setBusy(false); } };
  if (o === null && !e) return <p className="muted">Chargement…</p>;
  return <section className="panel narrow"><h1>Paiement (mode test)</h1>
    <p className="muted">Passerelle simulée : aucun argent n'est débité.</p>
    {o ? <><h3>{o.title} × {o.quantity}</h3><p><strong className="price">{o.total} TND</strong></p><Err e={e} />
      <button className="btn" onClick={pay} disabled={busy || o.status !== "pending_payment"}>Payer {o.total} TND (simulation)</button>{" "}
      <button className="btn ghost" onClick={() => nav("/orders")}>Retour</button></> : <Err e={e || "Commande introuvable."} />}</section>;
}

// Suivi des statuts de réservation : interroge le backend toutes les 30 s (onglet visible) et signale les changements.
const WATCH_MSG = { paid: o => `Paiement confirmé pour « ${o.title} » : ton QR code est prêt.`, collected: o => `« ${o.title} » a été retirée. Merci d'avoir sauvé ce repas !`, expired: o => `La réservation « ${o.title} » a expiré.`, cancelled: o => `La réservation « ${o.title} » a été annulée.` };
function useOrderWatch(me) {
  const prev = useRef(null);
  useEffect(() => {
    prev.current = null;
    if (!me || (me.role !== "student" && me.role !== "merchant")) return;
    let alive = true;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const list = await api("/api/my/orders"); if (!alive) return;
        const before = prev.current; prev.current = new Map(list.map(o => [o.id, o.status]));
        if (!before) return; // premier chargement : on mémorise sans notifier
        for (const o of list) {
          const old = before.get(o.id); if (old === o.status) continue;
          if (me.role === "merchant") { if (o.status === "paid") toast(`Nouvelle commande payée : ${o.title} × ${o.quantity}${o.studentName ? ` (${o.studentName})` : ""}.`); }
          else if (old && WATCH_MSG[o.status]) toast(WATCH_MSG[o.status](o), o.status === "paid" || o.status === "collected" ? "ok" : "warn");
        }
      } catch { /* hors ligne : on réessaiera */ }
    };
    tick(); const t = setInterval(tick, 30000); document.addEventListener("visibilitychange", tick);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [me?.uid, me?.role]);
}
const safeNext = (n) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") ? n : "");
const homeFor = (me) => (me.role === "admin" ? "/admin" : me.role === "merchant" ? "/shop" : "/");
function LoginRoute({ me, reload }) {
  const [params] = useSearchParams();
  if (me) return <Navigate to={safeNext(params.get("next")) || homeFor(me)} replace />;
  return <Login reload={reload} />;
}

function NotFound() { useTitle("Page introuvable"); return <div className="page"><Empty title="Page introuvable" text="Cette page n'existe pas ou a été déplacée."><Link className="btn" to="/">Retour à l'accueil</Link></Empty></div>; }
function ScrollTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }

// ---------- Application ----------
export default function App() {
  const [me, setMe] = useState(null), [ready, setReady] = useState(false), [toast, setToast] = useState(null);
  const [perm, setPerm] = useState(() => notificationsAvailable() ? Notification.permission : "unavailable");
  const seq = useRef(0), loc = useLocation();
  const reload = async () => { // seq évite qu'une réponse ancienne écrase une plus récente
    const n = ++seq.current; let m = null;
    try { m = fb.currentUser ? await api("/api/me") : null; } catch { m = null; }
    if (n === seq.current) setMe(m);
    return m;
  };
  useEffect(() => onAuthStateChanged(fb, async () => { await reload(); setReady(true); }), []);
  useEffect(() => { if (me) enableNotifications({ onForeground: setToast }); }, [me?.uid]);
  useOrderWatch(me && me.emailVerified !== false ? me : null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); }, [toast]);
  if (!ready) return <div className="boot" role="status" aria-label="Chargement"><span /></div>;
  if (me && me.emailVerified === false) return <VerifyEmail me={me} reload={reload} />; // adresse e-mail à vérifier avant d'accéder au site
  // Non connecté : vers la connexion avec retour à la page demandée. Connecté avec le mauvais rôle : message clair.
  const guard = (el, ...roles) => !me ? <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace /> : roles.includes(me.role) ? el : <Forbidden me={me} />;
  const all = ["student", "merchant", "admin"];
  const enableNotif = async () => { await enableNotifications({ ask: true, onForeground: setToast }); setPerm(Notification.permission); };
  return <>
    <a className="skip" href="#main">Aller au contenu</a>
    <ScrollTop />
    <Header me={me} perm={perm} onNotif={enableNotif} onLogout={() => signOut(fb)} />
    <main id="main"><Routes>
      <Route path="/" element={me?.role === "admin" ? <Navigate to="/admin" /> : <Home me={me} />} />
      <Route path="/catalog" element={<Catalog me={me} />} />
      <Route path="/offers" element={<Navigate to="/catalog" />} />
      <Route path="/offer/:id" element={<OfferDetail me={me} />} />
      <Route path="/radar" element={<Radar />} />
      <Route path="/impact" element={<Impact me={me} />} />
      <Route path="/login" element={<LoginRoute me={me} reload={reload} />} />
      <Route path="/register" element={<Navigate to="/login?signup=1" replace />} />
      <Route path="/signup" element={<Navigate to="/login?signup=1" replace />} />
      <Route path="/orders" element={guard(<div className="page"><Orders me={me} /></div>, "student", "merchant")} />
      <Route path="/reservations" element={<Navigate to="/orders" replace />} />
      <Route path="/restaurants" element={<Navigate to="/radar" replace />} />
      <Route path="/restaurant/:id" element={<Restaurant me={me} />} />
      <Route path="/favorites" element={me && me.role !== "student" ? <Forbidden me={me} /> : <Favorites me={me} />} />
      <Route path="/contact" element={<Contact me={me} />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/pay/:id" element={guard(<div className="page"><MockPay /></div>, "student")} />
      <Route path="/shop" element={guard(<Merchant me={me} />, "merchant")} />
      <Route path="/admin/*" element={guard(<Admin />, "admin")} />
      <Route path="/about" element={<About />} />
      <Route path="/partners" element={<Partners />} />
      <Route path="/dashboard" element={guard(<Dashboard me={me} />, ...all)} />
      <Route path="/profile" element={guard(<Profile me={me} reload={reload} />, ...all)} />
      <Route path="*" element={<NotFound />} />
    </Routes></main>
    <Footer />
    <BottomNav me={me} />
    <Toaster />
    {toast && <div className="toast" role="status"><strong>{toast.title}</strong>{toast.body}</div>}
  </>;
}
