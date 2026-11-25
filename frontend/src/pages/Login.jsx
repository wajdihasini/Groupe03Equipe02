import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { fb, api } from "../api.js";
import { EMAIL_RE, PHONE_RE, FB_ERR, Err, Field, FoodArt, Icon, Logo, useTitle } from "../components/ui.jsx";
import PasswordField from "../components/PasswordField.jsx";

const NAME_RE = /^[\p{L}][\p{L}\s'-]{1,39}$/u;
const EMPTY = { firstName: "", lastName: "", phone: "", email: "", password: "", confirm: "", role: "student", shopName: "", address: "" };

export default function Login({ reload }) {
  const nav = useNavigate(), [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("signup") === "1" ? "signup" : "login"); // login | signup | reset
  useTitle(mode === "signup" ? "Créer un compte" : mode === "reset" ? "Mot de passe oublié" : "Connexion");
  const [f, setF] = useState(EMPTY), [errs, setErrs] = useState({}), [e, setE] = useState(""), [info, setInfo] = useState(""), [busy, setBusy] = useState(false);
  const set = k => ev => setF({ ...f, [k]: ev.target.value });
  const cls = k => errs[k] ? "invalid" : "";
  const switchTo = (m) => { setMode(m); setErrs({}); setE(""); setInfo(""); };
  const check = () => {
    const x = {};
    if (!EMAIL_RE.test(f.email)) x.email = "Adresse e-mail invalide.";
    if (mode === "reset") return x;
    if (mode === "login") { if (!f.password) x.password = "Saisis ton mot de passe."; return x; }
    if (!NAME_RE.test(f.firstName.trim())) x.firstName = "Prénom invalide (2 lettres minimum).";
    if (!NAME_RE.test(f.lastName.trim())) x.lastName = "Nom invalide (2 lettres minimum).";
    if (!PHONE_RE.test(f.phone.trim())) x.phone = "Téléphone invalide : 8 chiffres (ex. 22 123 456).";
    if (f.password.length < 8) x.password = "8 caractères minimum."; else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) x.password = "Utilise au moins une lettre et un chiffre.";
    if (f.confirm !== f.password) x.confirm = "Les mots de passe ne correspondent pas.";
    if (f.role === "merchant" && f.shopName.trim().length < 2) x.shopName = "Le nom du commerce est obligatoire.";
    return x;
  };
  const submit = async ev => {
    ev.preventDefault(); setE(""); setInfo("");
    const x = check(); setErrs(x); if (Object.keys(x).length) return;
    setBusy(true);
    try {
      if (mode === "reset") { await sendPasswordResetEmail(fb, f.email); setInfo("Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé."); return; }
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(fb, f.email, f.password);
        const body = { firstName: f.firstName.trim(), lastName: f.lastName.trim(), phone: f.phone.trim(), role: f.role, ...(f.role === "merchant" && { shopName: f.shopName.trim(), address: f.address.trim() }) };
        try { await api("/api/users", { method: "POST", body }); }
        catch (err) { await cred.user.delete().catch(() => {}); throw err; } // évite un compte Firebase sans profil
      } else await signInWithEmailAndPassword(fb, f.email, f.password);
      const me = await reload();
      if (!me) { await signOut(fb); return setE("Profil introuvable ou compte bloqué."); }
      nav(me.role === "admin" ? "/admin" : me.role === "merchant" ? "/shop" : "/");
    } catch (err) { setE(FB_ERR[err.code] || err.message); } finally { setBusy(false); }
  };
  const signup = mode === "signup";
  return <div className="auth">
    <aside className="auth-side"><Logo light /><div><h2>{signup ? "Rejoins ceux qui sauvent des repas." : "Content de te revoir."}</h2>
      <ul><li><Icon name="bolt" size={18} />Réserve en deux clics</li><li><Icon name="qr" size={18} />Récupère avec un QR code</li><li><Icon name="leaf" size={18} />Gagne des EcoPoints</li></ul></div>
      <FoodArt category="Panier surprise" className="auth-art" /></aside>
    <div className="auth-main"><form className="auth-form" onSubmit={submit} noValidate>
      {mode !== "reset" ? <div className="seg" role="tablist" aria-label="Connexion ou inscription">
        <button type="button" role="tab" aria-selected={!signup} className={!signup ? "on" : ""} onClick={() => switchTo("login")}>Connexion</button>
        <button type="button" role="tab" aria-selected={signup} className={signup ? "on" : ""} onClick={() => switchTo("signup")}>Créer un compte</button></div>
        : <button type="button" className="back" onClick={() => switchTo("login")}>Retour à la connexion</button>}
      <h1>{signup ? "Créer ton compte" : mode === "reset" ? "Mot de passe oublié" : "Bon retour parmi nous"}</h1>
      <p className="muted">{signup ? "Quelques informations suffisent pour commencer à réserver." : mode === "reset" ? "Saisis ton e-mail : nous t'envoyons un lien pour choisir un nouveau mot de passe." : "Connecte-toi pour réserver, suivre tes commandes et gagner des EcoPoints."}</p>
      {signup && <>
        <fieldset className="roles"><legend>Je suis</legend>
          {[["student", "Étudiant", "Je réserve des repas"], ["merchant", "Commerçant", "Je vends mes invendus"]].map(([v, t, d]) => <label key={v} className={f.role === v ? "on" : ""}><input type="radio" name="role" checked={f.role === v} onChange={() => setF({ ...f, role: v })} /><b>{t}</b><small>{d}</small></label>)}</fieldset>
        <div className="two"><Field label="Prénom" error={errs.firstName}><input className={cls("firstName")} value={f.firstName} onChange={set("firstName")} autoComplete="given-name" /></Field>
          <Field label="Nom" error={errs.lastName}><input className={cls("lastName")} value={f.lastName} onChange={set("lastName")} autoComplete="family-name" /></Field></div>
        <Field label="Téléphone" error={errs.phone} hint="8 chiffres, indicatif +216 facultatif."><input className={cls("phone")} value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="22 123 456" /></Field></>}
      <Field label="Adresse e-mail" error={errs.email}><input type="email" className={cls("email")} value={f.email} onChange={set("email")} autoComplete="email" /></Field>
      {mode !== "reset" && <PasswordField label="Mot de passe" value={f.password} onChange={set("password")} error={errs.password} autoComplete={signup ? "new-password" : "current-password"} meter={signup} />}
      {signup && <PasswordField label="Confirmer le mot de passe" value={f.confirm} onChange={set("confirm")} error={errs.confirm} autoComplete="new-password" />}
      {signup && f.role === "merchant" && <><div className="two"><Field label="Nom du commerce" error={errs.shopName}><input className={cls("shopName")} value={f.shopName} onChange={set("shopName")} /></Field>
        <Field label="Adresse du commerce"><input value={f.address} onChange={set("address")} autoComplete="street-address" /></Field></div>
        <p className="note">Ton commerce sera visible après validation par l'administrateur.</p></>}
      {mode === "login" && <button type="button" className="forgot" onClick={() => switchTo("reset")}>Mot de passe oublié ?</button>}
      <Err e={e} />{info && <p className="ok" role="status">{info}</p>}
      <button className="btn lg block-btn" disabled={busy}>{busy ? "Patiente…" : signup ? "Créer mon compte" : mode === "reset" ? "Envoyer le lien" : "Se connecter"}</button>
      {mode !== "reset" && <p className="switch">{signup ? "Tu as déjà un compte ?" : "Nouveau sur CampusSave ?"}<button type="button" className="btn ghost small" onClick={() => switchTo(signup ? "login" : "signup")}>{signup ? "Se connecter" : "Créer un compte"}</button></p>}
    </form></div></div>;
}
