import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, CATEGORIES } from "../api.js";
import { ecoLevel, FAQ } from "../config.js";
import { CountUp, Err, FoodArt, Icon, OfferCard, OfferVisual, Section, SkeletonGrid, BASKET, fmt, pct, isNew, useTitle } from "../components/ui.jsx";
import { useReserve } from "../components/useReserve.js";

// Le prix descend de l'ancien au nouveau prix, une seule fois, au chargement.
function PriceDrop({ o }) {
  const [v, setV] = useState(o.originalPrice), [done, setDone] = useState(false), raf = useRef();
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setV(o.price); setDone(true); return; }
    const t0 = performance.now() + 700, d = 1600;
    const step = (t) => { const k = Math.max(0, Math.min(1, (t - t0) / d)); setV(o.originalPrice - (o.originalPrice - o.price) * (1 - Math.pow(1 - k, 3))); if (k < 1) raf.current = requestAnimationFrame(step); else setDone(true); };
    raf.current = requestAnimationFrame(step); return () => cancelAnimationFrame(raf.current);
  }, [o.id]);
  return <Link to={`/offer/${o.id}`} className="drop" aria-label={`${o.title} à ${fmt(o.price)} TND`}>
    <div className="drop-media"><OfferVisual o={o} /><span className={`drop-sticker ${done ? "pop" : ""}`}>-{pct(o)}%</span></div>
    <div className="drop-body"><p>{o.shopName}</p><h3>{o.title}</h3>
      <div className="drop-price"><s>{fmt(o.originalPrice)}</s><b>{fmt(v)}<small> TND</small></b></div></div></Link>;
}
const nowHM = () => new Date().toLocaleTimeString("fr-FR", { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const Faq = ({ items = FAQ }) => <div className="faq">{items.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>;

export default function Home({ me }) {
  useTitle("");
  const nav = useNavigate(), { reserve, msg } = useReserve(me);
  const [offers, setOffers] = useState(null), [shops, setShops] = useState([]), [impact, setImpact] = useState(null), [recs, setRecs] = useState([]), [err, setErr] = useState(""), [q, setQ] = useState("");
  useEffect(() => {
    api("/api/offers").then(setOffers).catch(x => { setErr(x.message); setOffers([]); });
    api("/api/impact").then(setImpact).catch(() => {}); api("/api/shops").then(setShops).catch(() => {});
  }, []);
  useEffect(() => { if (me?.role === "student") api("/api/recommendations").then(setRecs).catch(() => {}); else setRecs([]); }, [me?.uid]);

  const list = offers || [], hm = nowHM();
  const best = [...list].sort((a, b) => pct(b) - pct(a)), hasSales = list.some(o => o.sold > 0);
  const popular = [...list].sort((a, b) => b.sold - a.sold || pct(b) - pct(a)).slice(0, 4);
  const soon = list.filter(o => o.pickupTo > hm && o.category !== BASKET).sort((a, b) => a.pickupTo.localeCompare(b.pickupTo)).slice(0, 4);
  const fresh = list.filter(isNew).length ? list.filter(isNew).slice(0, 4) : [...list].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  const baskets = list.filter(o => o.category === BASKET).slice(0, 3);
  const hero = best[0], topShops = [...shops].sort((a, b) => b.offersCount - a.offersCount).slice(0, 6);
  const count = (c) => list.filter(o => o.category === c).length, catPhoto = (c) => list.find(o => o.category === c && o.photo)?.photo;
  const search = (e) => { e.preventDefault(); nav(`/catalog?q=${encodeURIComponent(q)}`); };

  return <>
    <section className="hero">
      <i className="blob b1" aria-hidden="true" /><i className="blob b2" aria-hidden="true" />
      <div className="hero-in">
        <div className="hero-copy">
          <p className="pill"><Icon name="leaf" size={16} />Anti-gaspi autour de l'ESSECT</p>
          <h1>Des repas du campus à -60 %, sauvés de la poubelle.</h1>
          <p className="lead">Les restaurants et cafétérias autour de l'ESSECT vendent leurs invendus du jour. Tu réserves, tu paies en ligne, tu récupères avec un QR code.</p>
          <form className="hero-search" onSubmit={search} role="search"><Icon name="search" /><input aria-label="Rechercher un produit ou un commerce" placeholder="Croissant, couscous, pizza, Café Médina…" value={q} onChange={e => setQ(e.target.value)} /><button className="btn lemon">Chercher</button></form>
          <div className="hero-cta"><Link className="btn ghost-light" to="/radar"><Icon name="pin" size={18} />Commerces près de moi</Link><Link className="btn ghost-light" to="/catalog?cat=Panier%20surprise"><Icon name="gift" size={18} />Paniers surprise</Link></div>
          {list.length > 0 && <ul className="hero-facts"><li><b>{list.length}</b> offres disponibles</li><li><b>{shops.length || "—"}</b> commerces partenaires</li><li>jusqu'à <b>-{pct(best[0])}%</b></li></ul>}
        </div>
        <div className="hero-stage" aria-hidden={!hero}>
          {hero ? <PriceDrop o={hero} /> : <div className="drop"><div className="drop-media"><FoodArt category="Panier surprise" /></div><div className="drop-body"><p>CampusSave</p><h3>Les premières offres arrivent</h3></div></div>}
        </div>
      </div>
    </section>

    <div className="page">
      <Err e={err || msg} />
      {impact && <section className="strip" aria-label="Impact de la communauté">
        <div><b><CountUp to={impact.meals} /></b><span>repas sauvés</span></div>
        <div><b><CountUp to={impact.savings} suffix=" TND" /></b><span>économisés par les étudiants</span></div>
        <div><b><CountUp to={impact.shops} /></b><span>commerces partenaires</span></div>
        <div><b><CountUp to={impact.students} /></b><span>étudiants inscrits</span></div></section>}

      <Section title="Que veux-tu manger ?" sub="Choisis une catégorie, on te montre ce qui est encore disponible.">
        <div className="cats">{CATEGORIES.map(c => <Link key={c} to={`/catalog?cat=${encodeURIComponent(c)}`} className="cat">{catPhoto(c) ? <img src={catPhoto(c)} alt="" loading="lazy" decoding="async" /> : <FoodArt category={c} />}<span><b>{c}</b><small>{count(c) ? `${count(c)} offre${count(c) > 1 ? "s" : ""}` : "Bientôt"}</small></span></Link>)}</div></Section>

      {soon.length > 0 && <Section title="À récupérer ce soir" sub="Les créneaux de retrait qui se terminent bientôt." action={<Link className="link" to="/catalog?sort=soon">Voir le catalogue</Link>}>
        <div className="grid">{soon.map(o => <OfferCard key={o.id} o={o} onQuick={reserve} />)}</div></Section>}

      {recs.length > 0 && <Section title="Pour toi" sub="Selon tes commandes passées."><div className="grid">{recs.slice(0, 4).map(o => <OfferCard key={o.id} o={o} reason={o.reason} onQuick={reserve} />)}</div></Section>}

      <Section title={hasSales ? "Les plus demandés" : "Les plus grosses réductions"} sub={hasSales ? "Ce que les étudiants réservent le plus en ce moment." : "À saisir avant que le stock ne parte."} action={<Link className="link" to="/catalog">Tout le catalogue</Link>}>
        {offers === null ? <SkeletonGrid /> : popular.length ? <div className="grid">{popular.map(o => <OfferCard key={o.id} o={o} onQuick={reserve} />)}</div> : <p className="muted">Aucune offre pour le moment. Reviens en fin de journée, quand les commerces publient leurs invendus.</p>}</Section>

      {baskets.length > 0 && <section className="basket-band">
        <div className="basket-copy"><FoodArt category={BASKET} className="basket-art" /><div><h2>Paniers surprise</h2><p>Tu ne sais pas ce qu'il y a dedans, et c'est le principe : le commerçant y glisse ses invendus du jour. La valeur annoncée est toujours supérieure au prix payé.</p><Link className="btn lemon" to="/catalog?cat=Panier%20surprise">Voir tous les paniers</Link></div></div>
        <div className="grid">{baskets.map(o => <OfferCard key={o.id} o={o} onQuick={reserve} />)}</div></section>}

      {fresh.length > 0 && <Section title={isNew(fresh[0]) ? "Nouveautés" : "Derniers ajouts"} sub="Publiées récemment par les commerces." action={<Link className="link" to="/catalog?sort=new">Voir plus</Link>}>
        <div className="grid">{fresh.map(o => <OfferCard key={o.id} o={o} onQuick={reserve} />)}</div></Section>}

      {topShops.length > 0 && <Section title="Les commerces partenaires" sub="Des adresses du quartier, validées par l'équipe CampusSave." action={<Link className="link" to="/radar">Voir la carte</Link>}>
        <div className="shops-row">{topShops.map(s => <Link key={s.id} to={`/catalog?shop=${s.id}`} className="shop-chip"><span className="avatar" style={{ width: 46, height: 46 }}>{s.name[0]}</span><div><b>{s.name}</b><small>{s.address || "Tunis"}</small></div><em>{s.offersCount} offre{s.offersCount > 1 ? "s" : ""}</em></Link>)}</div></Section>}

      <Section title="Pourquoi CampusSave ?" sub="Une idée simple qui profite à tout le monde.">
        <div className="why">{[["user", "Pour les étudiants", "De vrais repas à moitié prix, près du campus, réservés en quelques clics.", "cobalt"], ["store", "Pour les commerçants", "Une vente de plus au lieu d'un invendu jeté, et de nouveaux clients chaque jour.", "lemon"], ["leaf", "Pour la planète", "Chaque repas récupéré évite du gaspillage. Tu suis ton impact et tu gagnes des EcoPoints.", "mint"]]
          .map(([ic, t, d, tone]) => <article key={t} className={`why-card ${tone}`}><span><Icon name={ic} size={26} /></span><h3>{t}</h3><p>{d}</p></article>)}</div></Section>

      <Section title="Comment ça marche" sub="Du choix du plat à la récupération, tout se fait depuis ton téléphone.">
        <ol className="steps">{[["search", "Choisis", "Parcours le catalogue ou la carte et repère les offres proches."], ["bag", "Réserve", "Choisis la quantité. Le stock est bloqué pour toi pendant 15 minutes."], ["bolt", "Paie", "Règle ta commande en ligne pour confirmer la réservation."], ["qr", "Récupère", "Montre ton QR code au commerçant pendant le créneau de retrait."]]
          .map(([ic, t, d], i) => <li key={t}><span className="step-n">{i + 1}</span><Icon name={ic} size={26} /><h3>{t}</h3><p>{d}</p></li>)}</ol></Section>

      <section className="split">
        <Link to="/radar" className="split-card radar"><Icon name="pin" size={30} /><h3>Campus Radar</h3><p>Une carte des restaurants et cafétérias autour de toi, avec le nombre d'offres disponibles et la distance.</p><span className="btn small">Ouvrir la carte</span></Link>
        <Link to="/impact" className="split-card eco"><Icon name="leaf" size={30} /><h3>EcoPoints et impact</h3><p>Chaque repas récupéré te rapporte des points. {me?.role === "student" ? `Tu es niveau ${ecoLevel(me.ecoPoints).name}.` : "Monte de niveau et grimpe au classement."}</p><span className="btn small">Voir mon impact</span></Link></section>

      <Section title="Questions fréquentes" action={<Link className="link" to="/about#faq">Toutes les questions</Link>}><Faq items={FAQ.slice(0, 4)} /></Section>

      {(!me || me.role === "student") && <section className="merchant-cta"><div><h2>Tu tiens un restaurant ou une cafétéria ?</h2><p>Transforme tes invendus en ventes : publie une offre en 1 minute, suis tes commandes et valide les retraits par QR code.</p></div><Link className="btn lemon" to="/partners">Devenir partenaire</Link></section>}
    </div></>;
}
