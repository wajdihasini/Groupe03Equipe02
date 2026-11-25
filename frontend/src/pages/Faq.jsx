import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FAQ_GROUPS } from "../config.js";
import { Empty, Faq, Icon, useTitle } from "../components/ui.jsx";

const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function FaqPage() {
  useTitle("Questions fréquentes");
  const { hash } = useLocation(), [q, setQ] = useState("");
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }); }, [hash]);
  const groups = useMemo(() => {
    const s = norm(q.trim());
    return FAQ_GROUPS.map(g => ({ ...g, items: s ? g.items.filter(([a, b]) => norm(`${a} ${b}`).includes(s)) : g.items })).filter(g => g.items.length);
  }, [q]);
  return <div className="page narrow-page">
    <header className="page-head center-head"><span className="head-ico"><Icon name="help" size={28} /></span><h1>Questions fréquentes</h1><p>Tout ce qu'il faut savoir pour réserver, récupérer ou vendre sur CampusSave.</p></header>
    <label className="search faq-search"><Icon name="search" /><input aria-label="Rechercher dans la FAQ" placeholder="Annuler, QR code, panier surprise…" value={q} onChange={e => setQ(e.target.value)} /></label>
    <nav className="chips center" aria-label="Rubriques">{FAQ_GROUPS.map(g => <a key={g.id} className="chip static" href={`#${g.id}`}>{g.title}</a>)}</nav>
    {groups.map(g => <section className="block faq-group" id={g.id} key={g.id}><h2>{g.title}</h2><Faq items={g.items} /></section>)}
    {!groups.length && <Empty title="Aucune réponse trouvée" text="Essaie un autre mot-clé, ou écris-nous directement."><Link className="btn" to="/contact">Nous contacter</Link></Empty>}
    <section className="merchant-cta"><div><h2>Tu n'as pas trouvé ta réponse ?</h2><p>L'équipe CampusSave te répond rapidement.</p></div><Link className="btn lemon" to="/contact">Nous contacter</Link></section>
  </div>;
}
