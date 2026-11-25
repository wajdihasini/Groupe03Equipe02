import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

// ---------- Constantes et helpers partagés ----------
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, PHONE_RE = /^(\+216|00216)?\s?\d{2}\s?\d{3}\s?\d{3}$/; // 8 chiffres, +216 facultatif
export const STATUS = { pending_payment: "À payer", paid: "Payée · à retirer", collected: "Retirée", cancelled: "Annulée", expired: "Expirée" };
export const ROLE = { student: "Étudiant", merchant: "Commerçant", admin: "Administrateur" };
export const FB_ERR = {
  "auth/invalid-credential": "E-mail ou mot de passe incorrect.", "auth/user-not-found": "E-mail ou mot de passe incorrect.",
  "auth/wrong-password": "E-mail ou mot de passe incorrect.", "auth/email-already-in-use": "Cet e-mail est déjà utilisé.",
  "auth/weak-password": "Mot de passe trop faible (6 caractères minimum).", "auth/invalid-email": "Adresse e-mail invalide.",
  "auth/too-many-requests": "Trop de tentatives, réessayez plus tard.", "auth/network-request-failed": "Problème de connexion réseau.",
};
export const BASKET = "Panier surprise";
export const fmt = (v) => (+v).toFixed(2);
export const pct = (o) => Math.round((1 - o.price / o.originalPrice) * 100);
export const isNew = (o) => Date.now() - (o.createdAt || 0) < 48 * 3600e3;
export const isBasket = (o) => o.category === BASKET;
export const distanceKm = (a, b) => { // formule de haversine
  const r = (x) => (x * Math.PI) / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
export const fmtDist = (km) => (km < 1 ? `${Math.max(10, Math.round(km * 100) * 10)} m` : `${km.toFixed(1).replace(".", ",")} km`);

export function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}
export function useTitle(t) { useEffect(() => { document.title = t ? `${t} – CampusSave` : "CampusSave – Les bons plans du campus, sauvés du gaspillage"; }, [t]); }
const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Compteur animé : démarre quand il devient visible.
export function CountUp({ to = 0, decimals = 0, suffix = "", duration = 1400 }) {
  const ref = useRef(null), [v, setV] = useState(reduced() ? to : 0);
  useEffect(() => {
    if (reduced()) return setV(to);
    const el = ref.current; if (!el) return;
    let raf, started = false;
    const run = () => { const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / duration); setV(to * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; run(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el); return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref}>{v.toFixed(decimals).replace(".", ",")}{suffix}</span>;
}

// ---------- Petits composants de formulaire / états ----------
export const Err = ({ e }) => e ? <p className="err" role="alert">{e}</p> : null;
export const FieldErr = ({ e }) => e ? <p className="field-err" role="alert">{e}</p> : null;
export const Field = ({ label, error, hint, children }) => <label className="field"><span>{label}</span>{children}{hint && <small className="hint">{hint}</small>}<FieldErr e={error} /></label>;
export const Badge = ({ s }) => <span className={`badge ${s}`}>{STATUS[s] || s}</span>;
export const Empty = ({ title, text, children }) => <div className="empty"><FoodArt category="Autre" className="empty-art" /><h3>{title}</h3><p>{text}</p>{children}</div>;
export const SkeletonGrid = ({ n = 4 }) => <div className="grid">{Array.from({ length: n }, (_, i) => <div className="ticket skeleton" key={i}><div className="ticket-media" /><div className="ticket-body"><i /><i /><i /></div></div>)}</div>;

// ---------- Icônes (traits arrondis, 24 px) ----------
const P = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3", pin: "M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2", leaf: "M5 19c0-8 5-13 15-14 0 10-5 15-13 15M5 19c2-4 5-7 9-9",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4", user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
  menu: "M4 7h16M4 12h16M4 17h16", close: "M6 6l12 12M18 6L6 18", arrow: "M5 12h14M13 6l6 6-6 6", plus: "M12 5v14M5 12h14", minus: "M5 12h14",
  bag: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2", store: "M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0M10 20v-5h4v5",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h0", trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H4c0 3 1 5 4 5M16 6h4c0 3-1 5-4 5M12 13v4M8 21h8M10 17h4",
  nav: "M3 11l18-8-8 18-2-8z", check: "M5 12l5 5 9-10", bolt: "M13 3L5 14h6l-1 7 8-11h-6z", gift: "M4 11h16v9H4zM3 8h18v3H3zM12 8v12M12 8c-3 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2 3-5 3",
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  chart: "M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-9", spark: "M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z", phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", trend: "M3 17l6-6 4 4 8-8M15 7h6v6", logout: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9", cam: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};
export const Icon = ({ name, size = 20, className = "" }) => <svg className={`ico ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name]} /></svg>;

// ---------- Logo ----------
export const Logo = ({ light }) => <span className={`logo ${light ? "light" : ""}`}>
  <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="cs-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4f46e5" /><stop offset="1" stopColor="#7c3aed" /></linearGradient></defs>
    <rect width="64" height="64" rx="18" fill="url(#cs-logo)" /><path d="M32 13l5 14 14 5-14 5-5 14-5-14-14-5 14-5z" fill="#fff" /></svg>
  <b>Campus<i>Save</i></b></span>;

// ---------- Illustrations des produits (SVG, utilisées quand il n'y a pas de photo) ----------
const ART = {
  Viennoiserie: { bg: "#ffd84d", el: <g transform="translate(100 82)"><ellipse cx="-52" cy="14" rx="14" ry="22" transform="rotate(-62 -52 14)" fill="#d98a2b" /><ellipse cx="52" cy="14" rx="14" ry="22" transform="rotate(62 52 14)" fill="#d98a2b" /><ellipse cx="-34" cy="-2" rx="17" ry="27" transform="rotate(-38 -34 -2)" fill="#e9a23b" /><ellipse cx="34" cy="-2" rx="17" ry="27" transform="rotate(38 34 -2)" fill="#e9a23b" /><ellipse cx="0" cy="-8" rx="20" ry="31" fill="#f2b84b" /><path d="M-12 -30q12 8 24 0M-14 -12q14 8 28 0M-12 6q12 8 24 0" stroke="#c57a1f" strokeWidth="3" fill="none" strokeLinecap="round" /></g> },
  Sandwich: { bg: "#ff8a6b", el: <g transform="translate(100 74)"><path d="M-56 -4q0-34 56-34t56 34z" fill="#e9a23b" /><circle cx="-24" cy="-24" r="2.6" fill="#ffe8b0" /><circle cx="2" cy="-30" r="2.6" fill="#ffe8b0" /><circle cx="26" cy="-22" r="2.6" fill="#ffe8b0" /><path d="M-60-2q10 10 20 0t20 0t20 0t20 0t20 0t20 0v8h-120z" fill="#6bbf59" /><rect x="-56" y="6" width="112" height="9" rx="4.5" fill="#f0472b" /><rect x="-58" y="15" width="116" height="7" fill="#ffd84d" /><rect x="-56" y="22" width="112" height="13" rx="6.5" fill="#7a4a2a" /><path d="M-56 36h112q0 16-56 16t-56-16z" fill="#e9a23b" /></g> },
  Plat: { bg: "#7fd1ae", el: <g><ellipse cx="100" cy="98" rx="66" ry="30" fill="#fff" /><ellipse cx="100" cy="96" rx="52" ry="22" fill="#f1ece0" /><path d="M54 92q46-70 92 0q-46 20-92 0z" fill="#f6cf6b" /><circle cx="86" cy="70" r="7" fill="#f08a24" /><circle cx="112" cy="64" r="7" fill="#f08a24" /><circle cx="126" cy="80" r="6" fill="#f08a24" /><circle cx="98" cy="82" r="5" fill="#e3b65a" /><circle cx="76" cy="84" r="4.5" fill="#e3b65a" /><ellipse cx="104" cy="74" rx="11" ry="7" fill="#8a4f2b" /><path d="M88 40q-6-8 0-14M104 36q-6-8 0-14M120 40q-6-8 0-14" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity=".85" /></g> },
  Salade: { bg: "#b6e27c", el: <g><ellipse cx="70" cy="72" rx="28" ry="15" transform="rotate(-22 70 72)" fill="#5db35b" /><ellipse cx="130" cy="72" rx="28" ry="15" transform="rotate(22 130 72)" fill="#4fa14e" /><ellipse cx="100" cy="62" rx="30" ry="17" fill="#7ccb62" /><circle cx="84" cy="68" r="9" fill="#f0472b" /><circle cx="118" cy="62" r="9" fill="#f0472b" /><circle cx="102" cy="74" r="6" fill="#e2f1b8" /><circle cx="130" cy="78" r="4" fill="#2b2b2b" /><path d="M42 80h116q-4 44-58 44T42 80z" fill="#fff" /><path d="M48 96h104" stroke="#4f46e5" strokeWidth="5" /></g> },
  Dessert: { bg: "#ffb3c7", el: <g><path d="M66 88h68l-8 40H74z" fill="#f0472b" /><path d="M84 90l-3 36M100 90v36M116 90l3 36" stroke="#fff" strokeWidth="3" opacity=".7" /><ellipse cx="100" cy="86" rx="42" ry="14" fill="#fff" /><ellipse cx="100" cy="70" rx="31" ry="12" fill="#ffe3ec" /><ellipse cx="100" cy="56" rx="21" ry="10" fill="#fff" /><circle cx="100" cy="42" r="8" fill="#f0472b" /><path d="M100 34q4-10 12-10" stroke="#3f7d4e" strokeWidth="3" fill="none" strokeLinecap="round" /><rect x="78" y="72" width="7" height="3" rx="1.5" fill="#4f46e5" transform="rotate(-20 78 72)" /><rect x="116" y="66" width="7" height="3" rx="1.5" fill="#ffd84d" transform="rotate(25 116 66)" /></g> },
  Boisson: { bg: "#8ec5ff", el: <g><ellipse cx="100" cy="122" rx="48" ry="9" fill="#fff" opacity=".75" /><path d="M66 56h68l-6 58q-1 8-9 8H81q-8 0-9-8z" fill="#fff" /><path d="M69 76h62l-2.5 22H71.5z" fill="#4f46e5" /><path d="M134 66q22 2 20 20t-24 18" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" /><path d="M84 44q-7-9 0-17M100 44q-7-9 0-17M116 44q-7-9 0-17" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" /></g> },
  Autre: { bg: "#c9c2ff", el: <g><path d="M62 56h76l8 68H54z" fill="#d9a867" /><path d="M62 56h76l3 26H59z" fill="#c8924f" /><path d="M84 56q0-22 16-22t16 22" stroke="#8a5d2a" strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M100 84l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#ffd84d" /></g> },
  Pizza: { bg: "#ff8a6b", el: <g><circle cx="100" cy="80" r="56" fill="#d98a2b" /><circle cx="100" cy="80" r="49" fill="#f2b84b" /><circle cx="100" cy="80" r="42" fill="#f0472b" opacity=".85" /><circle cx="100" cy="80" r="40" fill="#ffe08a" opacity=".9" /><circle cx="84" cy="66" r="8" fill="#c8321c" /><circle cx="118" cy="72" r="8" fill="#c8321c" /><circle cx="96" cy="98" r="8" fill="#c8321c" /><circle cx="122" cy="98" r="6" fill="#c8321c" /><path d="M72 84l8-4M104 52l6 8M80 106l6 4" stroke="#3f7d4e" strokeWidth="4" strokeLinecap="round" /></g> },
  Brik: { bg: "#ffd84d", el: <g><path d="M46 108L100 38l54 70z" fill="#d98a2b" /><path d="M58 102L100 48l42 54z" fill="#f2b84b" /><path d="M72 96l28-34M100 100l14-22" stroke="#c57a1f" strokeWidth="3" strokeLinecap="round" /><circle cx="100" cy="84" r="9" fill="#fff" /><circle cx="100" cy="84" r="4.5" fill="#ffb300" /><path d="M140 112q14-6 22 6-14 8-22-6z" fill="#b6e27c" stroke="#3f7d4e" strokeWidth="2" /></g> },
  Sweets: { bg: "#ffb3c7", el: <g><ellipse cx="100" cy="112" rx="64" ry="14" fill="#fff" opacity=".8" /><g transform="rotate(45 64 84)"><rect x="40" y="60" width="48" height="48" rx="6" fill="#e9a23b" /><rect x="48" y="68" width="32" height="32" rx="4" fill="#f2c35b" /></g><g transform="rotate(45 136 84)"><rect x="112" y="60" width="48" height="48" rx="6" fill="#d98a2b" /><rect x="120" y="68" width="32" height="32" rx="4" fill="#e9a23b" /></g><g transform="rotate(45 100 52)"><rect x="78" y="30" width="44" height="44" rx="6" fill="#f2b84b" /><rect x="86" y="38" width="28" height="28" rx="4" fill="#ffd97a" /></g><circle cx="100" cy="52" r="5" fill="#3f7d4e" /><circle cx="64" cy="84" r="5" fill="#3f7d4e" /><circle cx="136" cy="84" r="5" fill="#3f7d4e" /></g> },
  Juice: { bg: "#ffc27a", el: <g><path d="M120 28l-12 54" stroke="#f0472b" strokeWidth="6" strokeLinecap="round" /><path d="M70 50h60l-8 70q-1 8-9 8H87q-8 0-9-8z" fill="#fff" opacity=".9" /><path d="M74 72h52l-5 48q-1 8-9 8H88q-8 0-9-8z" fill="#ff9d1c" /><circle cx="130" cy="60" r="20" fill="#ffd84d" stroke="#ff9d1c" strokeWidth="4" /><path d="M130 40v40M110 60h40M116 46l28 28M144 46l-28 28" stroke="#ff9d1c" strokeWidth="2" /></g> },
  Pasta: { bg: "#7fd1ae", el: <g><ellipse cx="100" cy="100" rx="66" ry="28" fill="#fff" /><ellipse cx="100" cy="98" rx="52" ry="20" fill="#f1ece0" /><path d="M58 94q20-40 42-30t42 30q-42 20-84 0z" fill="#f6cf6b" /><path d="M66 90q18-24 34-20M84 78q18-14 36-4M112 74q16 2 26 14M72 96q28 10 56 0" stroke="#e3b65a" strokeWidth="4" fill="none" strokeLinecap="round" /><circle cx="94" cy="72" r="6" fill="#f0472b" /><circle cx="114" cy="80" r="5" fill="#f0472b" /><path d="M100 58q6-10 14-6" stroke="#3f7d4e" strokeWidth="4" fill="none" strokeLinecap="round" /></g> },
  [BASKET]: { bg: "#4f46e5", el: <g><path d="M64 62h72l6 62H58z" fill="#fff" /><path d="M82 62q0-26 18-26t18 26" stroke="#c7d2fe" strokeWidth="6" fill="none" strokeLinecap="round" /><rect x="58" y="58" width="84" height="12" rx="4" fill="#e0e7ff" /><text x="100" y="114" textAnchor="middle" fontSize="48" fontWeight="800" fill="#4f46e5" fontFamily="Inter, sans-serif">?</text><path d="M34 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM164 30l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5zM160 100l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#c7d2fe" /></g> },
};
const KEYED = [[/pizza|calzone/i, "Pizza"], [/brik|mlawi|fricass/i, "Brik"], [/baklawa|makroudh|zlabia|kaak|bambalouni|baklava/i, "Sweets"], [/jus |jus$|smoothie|orange/i, "Juice"], [/pâtes|carbonara|spaghetti/i, "Pasta"]];
const PALETTE = ["#eef2ff", "#f1f5f9", "#f5f3ff", "#f8fafc"]; // fonds neutres : seules les couleurs du plat ressortent
const hash = (t) => [...String(t)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
// Sans photo : illustration choisie d'après le titre (pizza, brik, pâtisserie…) sinon la catégorie, avec une couleur de fond variée.
export function FoodArt({ category, title = "", className = "" }) {
  const key = category === BASKET ? BASKET : KEYED.find(([re]) => re.test(title))?.[1] || category, a = ART[key] || ART.Autre;
  const bg = category === BASKET ? "url(#cs-bk)" : PALETTE[hash(title || category) % PALETTE.length];
  return <svg className={`foodart ${className}`} viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" role="img" aria-label={category}>
    {category === BASKET && <defs><linearGradient id="cs-bk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4f46e5" /><stop offset="1" stopColor="#7c3aed" /></linearGradient></defs>}<rect width="200" height="150" fill={bg} /><circle cx="100" cy="80" r="62" fill="#fff" opacity=".28" /><circle cx="22" cy="24" r="4" fill="#fff" opacity=".5" /><circle cx="178" cy="122" r="6" fill="#fff" opacity=".4" />{a.el}</svg>;
}
// Photo réelle avec apparition en fondu ; si l'image ne charge pas, l'illustration prend le relais.
export function OfferVisual({ o }) {
  const [bad, setBad] = useState(false), [loaded, setLoaded] = useState(false);
  useEffect(() => { setBad(false); setLoaded(false); }, [o.photo]);
  if (!o.photo || bad) return <FoodArt category={o.category} title={o.title} />;
  return <img className={`photo ${loaded ? "ok" : ""}`} src={o.photo} alt={o.title} loading="lazy" decoding="async"
    ref={el => { if (el?.complete && el.naturalWidth) setLoaded(true); }} onLoad={() => setLoaded(true)} onError={() => setBad(true)} />;
}
export const isWikimedia = (url = "") => /upload\.wikimedia\.org/.test(url);

// ---------- Carte produit (ticket) ----------
export function OfferCard({ o, onQuick, reason }) {
  const left = o.quantity, urgent = left <= 3;
  return <article className={`ticket ${isBasket(o) ? "is-basket" : ""}`}>
    <Link to={`/offer/${o.id}`} className="ticket-media" aria-label={`Voir ${o.title}`}>
      <OfferVisual o={o} />
      <span className="sticker" aria-label={`${pct(o)} pour cent de réduction`}>-{pct(o)}%</span>
      <span className="ticket-badges">{isBasket(o) && <em className="tag basket">Surprise</em>}{isNew(o) && <em className="tag new">Nouveau</em>}{o.sold >= 3 && <em className="tag hot">Populaire</em>}</span>
    </Link>
    <div className="ticket-body">
      <p className="ticket-shop"><Icon name="pin" size={14} />{o.shopName}</p>
      <h3 className="ticket-title"><Link to={`/offer/${o.id}`}>{o.title}</Link></h3>
      {reason ? <p className="ticket-reason"><Icon name="spark" size={13} />{reason}</p> : o.description ? <p className="ticket-desc">{o.description}</p> : null}
      <div className="ticket-stub">
        <div className="ticket-price"><s>{fmt(o.originalPrice)} TND</s><strong>{fmt(o.price)}<small> TND</small></strong></div>
        <p className="ticket-meta"><Icon name="clock" size={14} />{o.pickupFrom}–{o.pickupTo}</p>
      </div>
      <div className={`stock ${urgent ? "urgent" : ""}`}><span><i style={{ width: `${Math.max(8, Math.min(100, (left / 12) * 100))}%` }} /></span><b>{urgent ? `Plus que ${left}` : `${left} disponibles`}</b></div>
      {onQuick && <button className="btn block" onClick={() => onQuick(o)}>Réserver 1 portion</button>}
    </div>
  </article>;
}

// ---------- En-tête ----------
export function Header({ me, perm, onNotif, onLogout }) {
  const [open, setOpen] = useState(false), [menu, setMenu] = useState(false), loc = useLocation(), box = useRef(null);
  useEffect(() => { setOpen(false); setMenu(false); }, [loc.pathname]);
  useEffect(() => { const f = (e) => { if (box.current && !box.current.contains(e.target)) setMenu(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  const admin = me?.role === "admin";
  const links = admin ? [["/admin", "Espace admin"], ["/catalog", "Catalogue"], ["/impact", "Impact"]] : [["/", "Accueil"], ["/catalog", "Catalogue"], ["/radar", "Radar"], ["/impact", "Impact"],
    ...(me?.role === "merchant" ? [["/shop", "Mon commerce"]] : []), ...(me ? [["/orders", "Commandes"]] : [])];
  return <header className="topbar"><div className="topbar-in">
    <Link to={admin ? "/admin" : "/"} aria-label="CampusSave, accueil"><Logo /></Link>
    <nav className={`navlinks ${open ? "open" : ""}`} aria-label="Navigation principale">{links.map(([to, l]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>{l}</NavLink>)}
      {!me && <div className="mobile-auth"><Link className="btn" to="/login?signup=1">Créer un compte</Link><Link className="btn ghost" to="/login">Se connecter</Link></div>}</nav>
    <div className="topbar-right">
      {me && perm === "default" && <button className="icon-btn" onClick={onNotif} aria-label="Activer les notifications" title="Activer les notifications"><Icon name="bell" /></button>}
      {me ? <div className="usermenu" ref={box}>
        <button className="avatar-btn" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menu du compte"><span className="avatar">{(me.name || "?")[0].toUpperCase()}</span><span className="uname">{me.name.split(" ")[0]}</span></button>
        {menu && <div className="dropdown" role="menu"><p><b>{me.name}</b><small>{ROLE[me.role]}</small></p>
          {admin && <Link to="/admin"><Icon name="shield" size={16} />Espace admin</Link>}{!admin && <Link to="/orders"><Icon name="qr" size={16} />Mes commandes</Link>}{me.role === "merchant" && <Link to="/shop"><Icon name="store" size={16} />Mon commerce</Link>}
          <Link to="/dashboard"><Icon name="chart" size={16} />Statistiques</Link><Link to="/profile"><Icon name="user" size={16} />Profil</Link>
          <button onClick={onLogout}><Icon name="logout" size={16} />Déconnexion</button></div>}
      </div> : <div className="auth-links"><Link className="btn small ghost" to="/login">Se connecter</Link><Link className="btn small" to="/login?signup=1">Créer un compte</Link></div>}
      <button className="icon-btn burger" onClick={() => setOpen(!open)} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open}><Icon name={open ? "close" : "menu"} /></button>
    </div></div></header>;
}

// ---------- Pied de page ----------
export function Footer() {
  return <footer className="footer"><div className="footer-in">
    <div className="footer-brand"><Logo light /><p>Les invendus des restaurants et cafétérias autour de l'ESSECT, à prix réduit. Moins de gaspillage, plus de bons plans pour les étudiants.</p>
      <Link className="btn lemon small" to="/catalog">Voir les offres du jour</Link></div>
    <div><h4>Explorer</h4><Link to="/catalog">Catalogue</Link><Link to="/catalog?cat=Panier%20surprise">Paniers surprise</Link><Link to="/radar">Campus Radar</Link><Link to="/impact">Impact et EcoPoints</Link></div>
    <div><h4>Aide</h4><Link to="/about">Comment ça marche</Link><Link to="/about#faq">Questions fréquentes</Link><Link to="/login">Mon compte</Link><Link to="/orders">Mes commandes</Link></div>
    <div><h4>Commerçants</h4><Link to="/partners">Devenir partenaire</Link><Link to="/login?signup=1">Créer un compte pro</Link><Link to="/shop">Mon commerce</Link></div>
  </div><div className="footer-end"><small>© {new Date().getFullYear()} CampusSave · Projet pédagogique de 3ème année E-Business, ESSECT (modules Intégration Web et Développement Mobile).</small><small>Photos de démonstration : <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> (licences libres, auteurs crédités sur chaque fiche produit).</small></div></footer>;
}

// ---------- Section de page et graphique en barres ----------
export const Section = ({ title, sub, action, children, className = "" }) => <section className={`block ${className}`}>
  <div className="block-head"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{action}</div>{children}</section>;

export function BarChart({ data, k, label, unit = "" }) {
  const max = Math.max(1, ...data.map(d => d[k]));
  return <div className="panel chart"><h3>{label}</h3>
    <div className="bars" role="img" aria-label={`${label} : ${data.map(d => `${d.date} ${d[k]}${unit}`).join(", ")}`}>
      {data.map(d => <div className="bar-col" key={d.date}><span className="bar-val">{d[k]}</span><div className="bar" style={{ height: `${Math.round((d[k] / max) * 110)}px` }} /><small>{d.date.slice(5)}</small></div>)}</div></div>;
}

// ---------- Pagination ----------
export const paginate = (arr, page, size) => arr.slice((page - 1) * size, page * size);
export function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const set = new Set([1, pages, page - 1, page, page + 1]), nums = [...set].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b), out = [];
  nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push("…" + n); out.push(n); });
  const go = (n) => { onChange(n); document.getElementById("main")?.scrollIntoView({ behavior: "smooth" }); };
  return <nav className="pager" aria-label="Pagination">
    <button onClick={() => go(page - 1)} disabled={page <= 1}>Précédent</button>
    {out.map(n => typeof n === "string" ? <span key={n} aria-hidden="true">…</span> : <button key={n} className={n === page ? "on" : ""} aria-current={n === page ? "page" : undefined} onClick={() => go(n)}>{n}</button>)}
    <button onClick={() => go(page + 1)} disabled={page >= pages}>Suivant</button></nav>;
}
export const Avatar = ({ name = "?", size = 36 }) => <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>{name.trim()[0]?.toUpperCase() || "?"}</span>;

// ---------- Navigation mobile (barre du bas), messages de confirmation ----------
export function BottomNav({ me }) {
  if (me?.role === "admin") return null;
  const items = !me ? [["/", "Accueil", "home", true], ["/catalog", "Catalogue", "grid"], ["/radar", "Radar", "pin"], ["/login", "Connexion", "user"]]
    : me.role === "merchant" ? [["/", "Accueil", "home", true], ["/catalog", "Catalogue", "grid"], ["/shop", "Mon commerce", "store"], ["/orders", "Commandes", "qr"], ["/profile", "Profil", "user"]]
    : [["/", "Accueil", "home", true], ["/catalog", "Catalogue", "grid"], ["/radar", "Radar", "pin"], ["/orders", "Commandes", "qr"], ["/profile", "Profil", "user"]];
  return <nav className="bottomnav" aria-label="Navigation mobile">{items.map(([to, l, ic, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}><Icon name={ic} size={22} /><span>{l}</span></NavLink>)}</nav>;
}
export const toast = (text, kind = "ok") => window.dispatchEvent(new CustomEvent("cs-toast", { detail: { text, kind, id: Date.now() } }));
export function Toaster() {
  const [t, setT] = useState(null);
  useEffect(() => { const f = (e) => setT(e.detail); window.addEventListener("cs-toast", f); return () => window.removeEventListener("cs-toast", f); }, []);
  useEffect(() => { if (!t) return; const id = setTimeout(() => setT(null), 4500); return () => clearTimeout(id); }, [t]);
  return t ? <div className={`snack ${t.kind}`} role="status" aria-live="polite"><span>{t.text}</span><button onClick={() => setT(null)} aria-label="Fermer">×</button></div> : null;
}
