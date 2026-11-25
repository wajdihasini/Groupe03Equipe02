import { useState } from "react";
import { Link } from "react-router-dom";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { fb, api } from "../api.js";
import { CAMPUS, ecoLevel } from "../config.js";
import RadarMap from "../components/RadarMap.jsx";
import PasswordField from "../components/PasswordField.jsx";
import { Avatar, EMAIL_RE, Err, FB_ERR, Field, Icon, PHONE_RE, ROLE, useTitle } from "../components/ui.jsx";

const NAME_RE = /^[\p{L}][\p{L}\s'-]{1,39}$/u;

// Profil commun aux trois rôles : prénom, nom, téléphone, e-mail, mot de passe. Le commerçant gère aussi son commerce.
export default function Profile({ me, reload }) {
  useTitle("Mon profil");
  const [first0, ...rest0] = (me.name || "").split(" ");
  const [p, setP] = useState({ firstName: me.firstName ?? first0 ?? "", lastName: me.lastName ?? rest0.join(" "), phone: me.phone || "", email: me.email || "" });
  const [pwd, setPwd] = useState(""), [errs, setErrs] = useState({}), [msg, setMsg] = useState(""), [e, setE] = useState("");
  const [sec, setSec] = useState({ current: "", next: "", confirm: "" }), [secErrs, setSecErrs] = useState({}), [secMsg, setSecMsg] = useState(""), [secE, setSecE] = useState("");
  const sh = me.shop || {};
  const [shop, setShop] = useState({ name: sh.name || "", address: sh.address || "", phone: sh.phone || "", description: sh.description || "" });
  const [pos, setPos] = useState(sh.lat != null && sh.lng != null ? { lat: sh.lat, lng: sh.lng } : null), [shopMsg, setShopMsg] = useState(""), [shopE, setShopE] = useState("");
  const lvl = me.role === "student" ? ecoLevel(me.ecoPoints) : null;
  const set = k => ev => setP({ ...p, [k]: ev.target.value });

  const savePerson = async ev => {
    ev.preventDefault(); setMsg(""); setE("");
    const x = {}, emailChanged = p.email.trim().toLowerCase() !== (me.email || "").toLowerCase();
    if (!NAME_RE.test(p.firstName.trim())) x.firstName = "Prénom invalide (2 lettres minimum).";
    if (!NAME_RE.test(p.lastName.trim())) x.lastName = "Nom invalide (2 lettres minimum).";
    if (!PHONE_RE.test(p.phone.trim())) x.phone = "Téléphone invalide : 8 chiffres.";
    if (!EMAIL_RE.test(p.email.trim())) x.email = "Adresse e-mail invalide.";
    if (emailChanged && !pwd) x.pwd = "Saisis ton mot de passe actuel pour changer d'e-mail.";
    setErrs(x); if (Object.keys(x).length) return;
    try {
      if (emailChanged) { await reauthenticateWithCredential(fb.currentUser, EmailAuthProvider.credential(fb.currentUser.email, pwd)); await fb.currentUser.getIdToken(true); }
      await api("/api/me", { method: "PUT", body: { firstName: p.firstName.trim(), lastName: p.lastName.trim(), phone: p.phone.trim(), email: p.email.trim() } });
      await reload(); setPwd(""); setMsg("Tes informations ont été mises à jour.");
    } catch (err) { setE(FB_ERR[err.code] || err.message); }
  };
  const savePassword = async ev => {
    ev.preventDefault(); setSecMsg(""); setSecE("");
    const x = {};
    if (!sec.current) x.current = "Saisis ton mot de passe actuel.";
    if (sec.next.length < 8 || !/[A-Za-z]/.test(sec.next) || !/\d/.test(sec.next)) x.next = "8 caractères minimum, avec une lettre et un chiffre.";
    if (sec.confirm !== sec.next) x.confirm = "Les mots de passe ne correspondent pas.";
    setSecErrs(x); if (Object.keys(x).length) return;
    try {
      await reauthenticateWithCredential(fb.currentUser, EmailAuthProvider.credential(fb.currentUser.email, sec.current));
      await updatePassword(fb.currentUser, sec.next); setSec({ current: "", next: "", confirm: "" }); setSecMsg("Mot de passe modifié.");
    } catch (err) { setSecE(FB_ERR[err.code] || err.message); }
  };
  const saveShop = async ev => {
    ev.preventDefault(); setShopMsg(""); setShopE("");
    if (shop.name.trim().length < 2) return setShopE("Le nom du commerce est obligatoire.");
    if (shop.phone && !PHONE_RE.test(shop.phone)) return setShopE("Téléphone du commerce invalide : 8 chiffres.");
    try { await api("/api/shop", { method: "PUT", body: { ...shop, lat: pos ? pos.lat : null, lng: pos ? pos.lng : null } }); await reload(); setShopMsg("Informations du commerce mises à jour."); }
    catch (err) { setShopE(err.message); }
  };
  const ss = k => ev => setShop({ ...shop, [k]: ev.target.value });
  const here = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(q => setPos({ lat: +q.coords.latitude.toFixed(6), lng: +q.coords.longitude.toFixed(6) }), () => setShopE("Position indisponible : clique sur la carte pour placer ton commerce."), { enableHighAccuracy: true, timeout: 10000 }) : setShopE("Géolocalisation indisponible.");

  return <div className="page">
    <header className="page-head"><h1>Mon profil</h1><p>Gère tes informations personnelles et la sécurité de ton compte.</p></header>
    <div className="profile">
      <aside className="panel profile-card"><Avatar name={me.name} size={72} /><h2>{me.name}</h2><span className="badge ok">{ROLE[me.role]}</span>
        <p className="muted">{me.email}</p>{me.phone && <p className="muted">{me.phone}</p>}
        {lvl && <div className="mini-eco"><Icon name="leaf" size={18} /><div><b>{me.ecoPoints || 0} EcoPoints</b><small>Niveau {lvl.name}</small></div></div>}
        {me.role === "merchant" && <p className={`badge ${sh.approved ? "ok" : "wait"}`}>{sh.approved ? "Commerce validé" : "Validation en attente"}</p>}
        {lvl && <Link className="btn ghost small" to="/impact">Voir mon impact</Link>}</aside>
      <div className="profile-forms">
        <form className="panel" onSubmit={savePerson} noValidate><h3>Informations personnelles</h3>
          <div className="two"><Field label="Prénom" error={errs.firstName}><input className={errs.firstName ? "invalid" : ""} value={p.firstName} onChange={set("firstName")} autoComplete="given-name" /></Field>
            <Field label="Nom" error={errs.lastName}><input className={errs.lastName ? "invalid" : ""} value={p.lastName} onChange={set("lastName")} autoComplete="family-name" /></Field></div>
          <div className="two"><Field label="Téléphone" error={errs.phone}><input className={errs.phone ? "invalid" : ""} value={p.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" /></Field>
            <Field label="Adresse e-mail" error={errs.email}><input type="email" className={errs.email ? "invalid" : ""} value={p.email} onChange={set("email")} autoComplete="email" /></Field></div>
          {p.email.trim().toLowerCase() !== (me.email || "").toLowerCase() && <PasswordField label="Mot de passe actuel (requis pour changer d'e-mail)" value={pwd} onChange={ev => setPwd(ev.target.value)} error={errs.pwd} autoComplete="current-password" />}
          <Err e={e} />{msg && <p className="ok" role="status">{msg}</p>}<div className="actions"><button className="btn">Enregistrer</button></div></form>

        <form className="panel" onSubmit={savePassword} noValidate><h3>Mot de passe</h3>
          <PasswordField label="Mot de passe actuel" value={sec.current} onChange={ev => setSec({ ...sec, current: ev.target.value })} error={secErrs.current} autoComplete="current-password" />
          <div className="two"><PasswordField label="Nouveau mot de passe" value={sec.next} onChange={ev => setSec({ ...sec, next: ev.target.value })} error={secErrs.next} autoComplete="new-password" meter />
            <PasswordField label="Confirmer" value={sec.confirm} onChange={ev => setSec({ ...sec, confirm: ev.target.value })} error={secErrs.confirm} autoComplete="new-password" /></div>
          <Err e={secE} />{secMsg && <p className="ok" role="status">{secMsg}</p>}<div className="actions"><button className="btn ghost">Changer le mot de passe</button></div></form>

        {me.role === "merchant" && <form className="panel" onSubmit={saveShop}><h3>Mon commerce</h3>
          <div className="form-grid"><Field label="Nom du commerce"><input value={shop.name} onChange={ss("name")} /></Field><Field label="Adresse"><input value={shop.address} onChange={ss("address")} /></Field>
            <Field label="Téléphone du commerce"><input value={shop.phone} onChange={ss("phone")} inputMode="tel" /></Field></div>
          <Field label="Description" hint="Visible par les étudiants sur le Campus Radar."><input value={shop.description} onChange={ss("description")} maxLength={300} /></Field>
          <div className="locate"><h4><Icon name="pin" size={18} />Position sur le Campus Radar</h4>
            <p className="muted">{pos ? `Position enregistrée : ${pos.lat}, ${pos.lng}` : "Position non renseignée : ton commerce n'apparaît pas sur la carte."}</p>
            <div className="locate-actions"><button type="button" className="btn small" onClick={here}><Icon name="nav" size={16} />Utiliser ma position</button>{pos && <button type="button" className="btn small ghost" onClick={() => setPos(null)}>Retirer</button>}</div>
            <RadarMap center={pos || CAMPUS} picked={pos} onPick={(lat, lng) => setPos({ lat, lng })} zoom={15} /><small className="muted">Clique sur la carte pour placer ton commerce, puis enregistre.</small></div>
          <Err e={shopE} />{shopMsg && <p className="ok" role="status">{shopMsg}</p>}<div className="actions"><button className="btn">Enregistrer le commerce</button></div></form>}
      </div></div></div>;
}
