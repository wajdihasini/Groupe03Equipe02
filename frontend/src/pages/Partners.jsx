import { Link } from "react-router-dom";
import { FoodArt, Icon, Section, useTitle } from "../components/ui.jsx";

export default function Partners() {
  useTitle("Devenir partenaire");
  return <div className="page">
    <section className="partner-hero"><div><h1>Vends tes invendus, pas tes déchets.</h1><p className="lead">Restaurants, cafétérias, boulangeries : publie tes invendus du jour à prix réduit et fais-les récupérer par les étudiants du quartier, sans effort.</p>
      <div className="cta-actions"><Link className="btn lemon lg" to="/login?signup=1">Créer mon compte commerçant</Link><Link className="btn ghost-light lg" to="/about">Comment ça marche</Link></div></div>
      <FoodArt category="Panier surprise" className="partner-art" /></section>
    <Section title="Ce que tu y gagnes">
      <div className="why">{[["bag", "Moins de pertes", "Chaque invendu vendu est un produit de moins à jeter et un revenu en plus.", "lemon"], ["user", "Nouveaux clients", "Les étudiants du campus découvrent ton commerce et reviennent.", "cobalt"], ["chart", "Suivi simple", "Statistiques de ventes, produits les plus demandés et repas sauvés.", "mint"]]
        .map(([ic, t, d, tone]) => <article key={t} className={`why-card ${tone}`}><span><Icon name={ic} size={26} /></span><h3>{t}</h3><p>{d}</p></article>)}</div></Section>
    <Section title="Rejoindre CampusSave en 3 étapes">
      <ol className="steps">{[["user", "Inscris-toi", "Crée un compte commerçant avec le nom et l'adresse de ton commerce."], ["shield", "Fais-toi valider", "L'équipe vérifie ton commerce avant de le rendre visible aux étudiants."], ["qr", "Publie et valide", "Publie tes offres, puis scanne le QR code des étudiants au retrait."]]
        .map(([ic, t, d], i) => <li key={t}><span className="step-n">{i + 1}</span><Icon name={ic} size={26} /><h3>{t}</h3><p>{d}</p></li>)}</ol></Section>
    <Section title="Tes outils au quotidien"><ul className="checks">{["Publication d'une offre avec photo, prix, quantité et créneau de retrait", "Paniers surprise pour écouler les fins de journée", "Validation des retraits par scan de QR code ou saisie du code", "Position sur le Campus Radar pour être trouvé près du campus", "Notifications à chaque commande payée"].map(t => <li key={t}><Icon name="check" size={18} />{t}</li>)}</ul></Section>
  </div>;
}
