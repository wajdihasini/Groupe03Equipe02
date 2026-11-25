import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FAQ } from "../config.js";
import { Faq, FoodArt, Icon, Section, useTitle } from "../components/ui.jsx";

const STEPS = [
  ["search", "1. Tu choisis", "Dans le catalogue ou sur le Campus Radar, repère une offre : le prix barré, le prix réduit, le créneau de retrait et le stock restant sont toujours affichés."],
  ["bag", "2. Tu réserves", "Choisis la quantité (jusqu'à 10 portions). Le stock est immédiatement bloqué pour toi : personne ne peut te le prendre pendant 15 minutes."],
  ["bolt", "3. Tu paies", "Règle ta commande en ligne depuis « Mes commandes ». Le paiement confirme ta réservation et génère ton QR code."],
  ["qr", "4. Tu récupères", "Pendant le créneau de retrait, montre ton QR code au commerçant. Il le scanne, valide ta commande, et tu gagnes des EcoPoints."],
];
export default function About() {
  useTitle("Comment ça marche");
  const { hash } = useLocation();
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }); }, [hash]);
  return <div className="page">
    <header className="page-head"><h1>Comment ça marche</h1><p>CampusSave met en relation les étudiants et les commerces autour de l'ESSECT pour réduire le gaspillage alimentaire.</p></header>
    <ol className="steps big">{STEPS.map(([ic, t, d]) => <li key={t}><Icon name={ic} size={30} /><h3>{t}</h3><p>{d}</p></li>)}</ol>
    <Section title="Trois rôles, une plateforme">
      <div className="why">{[["user", "Étudiant", "Consulte les offres, réserve, paie, récupère et gagne des EcoPoints.", "cobalt"], ["store", "Commerçant", "Publie ses invendus, suit ses commandes, scanne les QR codes et consulte ses statistiques.", "lemon"], ["shield", "Administrateur", "Valide les commerces, gère les comptes et supervise la plateforme.", "mint"]]
        .map(([ic, t, d, tone]) => <article key={t} className={`why-card ${tone}`}><span><Icon name={ic} size={26} /></span><h3>{t}</h3><p>{d}</p></article>)}</div></Section>
    <Section title="Questions fréquentes"><div id="faq"><Faq items={FAQ} /></div></Section>
    <section className="merchant-cta"><div><h2>Prêt à sauver ton premier repas ?</h2><p>Crée ton compte en moins d'une minute.</p></div><div className="cta-actions"><Link className="btn lemon" to="/login?signup=1">Créer un compte</Link><Link className="btn ghost-light" to="/catalog">Voir les offres</Link></div></section>
  </div>;
}
