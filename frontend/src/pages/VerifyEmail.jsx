import { useEffect, useRef, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from "firebase/auth";
import { fb, api } from "../api.js";
import { EMAIL_RE, Err, FB_ERR, Field, Icon, Logo, useTitle } from "../components/ui.jsx";
import PasswordField from "../components/PasswordField.jsx";
import "./verify.css";

const mask = (e = "") => e.replace(/^(.).*(@.*)$/, (_, a, d) => `${a}•••••${d}`);

// Affiché à la place du site tant que l'adresse e-mail n'est pas vérifiée (inscription ou changement d'e-mail).
export default function VerifyEmail({ me, reload }) {
  useTitle("Vérification de l'e-mail");
  const [digits, setDigits] = useState(Array(6).fill("")), refs = useRef([]), sent = useRef(false);
  const [e, setE] = useState(""), [info, setInfo] = useState(""), [busy, setBusy] = useState(false), [wait, setWait] = useState(0), [dev, setDev] = useState(false), [edit, setEdit] = useState(false), [form, setForm] = useState({ email: "", password: "" });
  const code = digits.join("");

  const send = async (manual) => {
    setE(""); setInfo("");
    try {
      const r = await api("/api/verify/send", { method: "POST" }); setWait(r.wait || 0); setDev(!!r.dev);
      if (r.already) await reload(); else if (manual && !r.cooldown) setInfo("Un nouveau code vient d'être envoyé.");
    } catch (x) { setE(x.message); }
  };
  useEffect(() => { if (sent.current) return; sent.current = true; send(false); }, []); // un code est envoyé à l'ouverture (le serveur limite les renvois)
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const confirm = async (c = code) => {
    if (c.length !== 6) return setE("Saisis les 6 chiffres du code.");
    setBusy(true); setE("");
    try { await api("/api/verify/confirm", { method: "POST", body: { code: c } }); await reload(); }
    catch (x) { setE(x.message); setDigits(Array(6).fill("")); refs.current[0]?.focus(); setBusy(false); }
  };
  const change = (i, v) => { // gère la saisie, le collage du code complet et le passage au chiffre suivant
    const d = v.replace(/\D/g, ""), n = [...digits];
    if (!d) { n[i] = ""; return setDigits(n); }
    d.split("").slice(0, 6 - i).forEach((c, k) => { n[i + k] = c; });
    setDigits(n); refs.current[Math.min(5, i + d.length)]?.focus();
    if (n.every(Boolean)) confirm(n.join(""));
  };
  const key = (i, ev) => { if (ev.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus(); };

  const changeEmail = async (ev) => {
    ev.preventDefault(); setE("");
    if (!EMAIL_RE.test(form.email.trim())) return setE("Adresse e-mail invalide.");
    if (!form.password) return setE("Saisis ton mot de passe pour confirmer.");
    try {
      await reauthenticateWithCredential(fb.currentUser, EmailAuthProvider.credential(fb.currentUser.email, form.password)); await fb.currentUser.getIdToken(true);
      const [f0, ...r0] = (me.name || "").split(" ");
      await api("/api/me", { method: "PUT", body: { firstName: me.firstName ?? f0, lastName: me.lastName ?? r0.join(" "), phone: me.phone || "", email: form.email.trim() } });
      setEdit(false); setForm({ email: "", password: "" }); await reload(); setDigits(Array(6).fill("")); await send(false); setInfo("Adresse modifiée : un code a été envoyé à ta nouvelle adresse.");
    } catch (x) { setE(FB_ERR[x.code] || x.message); }
  };

  return <div className="verify">
    <header><Logo /><button className="link" onClick={() => signOut(fb)}>Se déconnecter</button></header>
    <main><div className="verify-card">
      <span className="verify-ico"><Icon name="shield" size={30} /></span>
      <h1>Vérifie ton adresse e-mail</h1>
      <p className="muted">Nous avons envoyé un code à 6 chiffres à <b>{mask(me.email)}</b>. Il est valable 10 minutes. Pense à regarder dans les courriers indésirables.</p>
      {dev && <p className="note warn">Mode développement : l'envoi d'e-mails n'est pas configuré. Le code est affiché dans le terminal du backend.</p>}
      <div className="code" role="group" aria-label="Code de vérification">{digits.map((d, i) => <input key={i} ref={el => (refs.current[i] = el)} value={d} inputMode="numeric" autoComplete={i ? "off" : "one-time-code"} aria-label={`Chiffre ${i + 1} sur 6`} onChange={ev => change(i, ev.target.value)} onKeyDown={ev => key(i, ev)} onFocus={ev => ev.target.select()} disabled={busy} />)}</div>
      <Err e={e} />{info && <p className="ok" role="status">{info}</p>}
      <button className="btn lg block-btn" onClick={() => confirm()} disabled={busy || code.length < 6}>{busy ? "Vérification…" : "Vérifier mon e-mail"}</button>
      <p className="switch">{wait > 0 ? `Nouveau code possible dans ${wait} s.` : "Tu n'as rien reçu ?"}<button className="btn ghost small" onClick={() => send(true)} disabled={wait > 0}>Renvoyer le code</button></p>
      <button className="link" onClick={() => setEdit(!edit)}>Mauvaise adresse ? La modifier</button>
      {edit && <form onSubmit={changeEmail} noValidate>
        <Field label="Nouvelle adresse e-mail"><input type="email" value={form.email} onChange={ev => setForm({ ...form, email: ev.target.value })} autoComplete="email" /></Field>
        <PasswordField label="Mot de passe actuel" value={form.password} onChange={ev => setForm({ ...form, password: ev.target.value })} autoComplete="current-password" />
        <button className="btn block-btn">Changer et recevoir un nouveau code</button></form>}
    </div></main></div>;
}
