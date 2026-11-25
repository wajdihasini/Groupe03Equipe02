import { useState } from "react";
import { Link } from "react-router-dom";
import { CONTACT_EMAIL } from "../config.js";
import { EMAIL_RE, Err, Field, Icon, useTitle } from "../components/ui.jsx";

const SUBJECTS = ["Question sur une réservation", "Devenir commerce partenaire", "Problème technique", "Suggestion", "Autre"];

// Pas d'endpoint « contact » dans le backend : le formulaire prépare un e-mail dans la messagerie de l'utilisateur.
export default function Contact({ me }) {
  useTitle("Contact");
  const [f, setF] = useState({ name: me?.name || "", email: me?.email || "", subject: SUBJECTS[0], message: "" });
  const [errs, setErrs] = useState({}), [sent, setSent] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = e => {
    e.preventDefault(); setSent(false);
    const x = {};
    if (f.name.trim().length < 2) x.name = "Indique ton nom.";
    if (!EMAIL_RE.test(f.email.trim())) x.email = "Adresse e-mail invalide.";
    if (f.message.trim().length < 10) x.message = "Ton message doit faire au moins 10 caractères.";
    setErrs(x); if (Object.keys(x).length) return;
    const body = `${f.message.trim()}\n\n—\n${f.name.trim()} <${f.email.trim()}>${me ? `\nCompte CampusSave : ${me.role}` : ""}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[CampusSave] ${f.subject}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  return <div className="page">
    <header className="page-head"><h1>Contact</h1><p>Une question, un souci avec une commande ou envie de rejoindre CampusSave ? Écris-nous.</p></header>
    <div className="contact">
      <div className="contact-side">
        {[["help", "Questions fréquentes", "Annulation, QR code, paniers surprise : la plupart des réponses sont déjà là.", "/faq", "Lire la FAQ"],
          ["store", "Commerçants", "Restaurant, cafétéria ou boulangerie près du campus ? Découvre comment nous rejoindre.", "/partners", "Devenir partenaire"],
          ["qr", "Suivre une réservation", "Statut, QR code et historique sont dans ton espace.", me ? "/orders" : "/login?next=%2Forders", me ? "Mes réservations" : "Se connecter"]]
          .map(([ic, t, d, to, l]) => <article className="contact-card" key={t}><span className="kpi-ico"><Icon name={ic} size={22} /></span><div><h3>{t}</h3><p>{d}</p><Link className="link" to={to}>{l}</Link></div></article>)}
        {CONTACT_EMAIL && <article className="contact-card"><span className="kpi-ico"><Icon name="mail" size={22} /></span><div><h3>E-mail</h3><p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></div></article>}
      </div>
      {CONTACT_EMAIL ? <form className="panel contact-form" onSubmit={submit} noValidate><h3>Envoyer un message</h3>
        <div className="two"><Field label="Nom" error={errs.name}><input className={errs.name ? "invalid" : ""} value={f.name} onChange={set("name")} autoComplete="name" /></Field>
          <Field label="Adresse e-mail" error={errs.email}><input type="email" className={errs.email ? "invalid" : ""} value={f.email} onChange={set("email")} autoComplete="email" /></Field></div>
        <Field label="Sujet"><select value={f.subject} onChange={set("subject")}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Message" error={errs.message} hint={`${f.message.length}/1000`}><textarea rows="6" maxLength={1000} className={errs.message ? "invalid" : ""} value={f.message} onChange={set("message")} placeholder="Décris ta demande. Pour une commande, précise le produit et l'heure de réservation." /></Field>
        <p className="fine"><Icon name="mail" size={16} />Le bouton ouvre ta messagerie avec le message prêt à envoyer à {CONTACT_EMAIL}.</p>
        {sent && <p className="ok" role="status">Ta messagerie s'est ouverte : il ne reste qu'à envoyer le message. Rien ne s'est ouvert ? Écris directement à {CONTACT_EMAIL}.</p>}
        <div className="actions"><button className="btn">Préparer l'e-mail</button></div></form>
        : <div className="panel contact-form"><h3>Nous écrire</h3><Err e="" /><p className="muted">Le formulaire de contact sera disponible prochainement. En attendant, consulte la FAQ ou, si tu es commerçant, crée ton compte pro : l'équipe te contactera lors de la validation.</p>
          <div className="actions"><Link className="btn" to="/faq">Lire la FAQ</Link><Link className="btn ghost" to="/partners">Devenir partenaire</Link></div></div>}
    </div>
  </div>;
}
