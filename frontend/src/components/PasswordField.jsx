import { useState } from "react";
import { Field } from "./ui.jsx";

// Champ mot de passe avec bouton Afficher/Masquer et, en option, une jauge de robustesse.
export default function PasswordField({ label, value, onChange, error, autoComplete, meter = false }) {
  const [show, setShow] = useState(false);
  const score = meter ? [/.{8,}/, /[A-Z]/, /\d/, /[^\w\s]/].filter(r => r.test(value)).length : 0;
  return <Field label={label} error={error}>
    <div className="pwd"><input type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} className={error ? "invalid" : ""} />
      <button type="button" onClick={() => setShow(!show)} aria-pressed={show}>{show ? "Masquer" : "Afficher"}</button></div>
    {meter && value && <div className={`strength s${score}`} aria-live="polite"><i /><i /><i /><i /><small>{["Très faible", "Faible", "Moyen", "Bon", "Excellent"][score]}</small></div>}
  </Field>;
}
