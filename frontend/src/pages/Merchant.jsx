import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { api, CATEGORIES } from "../api.js";
import { BASKET, Err, Field, Icon, OfferCard, Empty, Pager, fmt, paginate, useTitle } from "../components/ui.jsx";

// Scanner de QR code (caméra)
function Scanner({ onScan, onFail }) {
  useEffect(() => {
    const s = new Html5Qrcode("qr-reader"); let live = true, started = false, done = false;
    s.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, txt => { if (!done) { done = true; onScan(txt); } }, () => {})
      .then(() => { started = true; if (!live) s.stop().catch(() => {}); })
      .catch(() => onFail("Caméra inaccessible : saisissez le code manuellement."));
    return () => { live = false; if (started) s.stop().then(() => s.clear()).catch(() => {}); };
  }, []);
  return <div id="qr-reader" className="scanner" />;
}

// Redimensionne la photo choisie (JPEG, 720 px max) pour la stocker dans l'offre sans service de fichiers.
async function fileToDataUrl(file) {
  const bmp = await createImageBitmap(file), k = Math.min(1, 720 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  let q = 0.8, url = c.toDataURL("image/jpeg", q);
  while (url.length > 350000 && q > 0.4) { q -= 0.1; url = c.toDataURL("image/jpeg", q); }
  return url;
}

export default function Merchant({ me }) {
  useTitle("Mon commerce");
  const empty = { title: "", category: "Plat", description: "", photo: "", originalPrice: "", price: "", quantity: "", pickupFrom: "17:00", pickupTo: "19:00" };
  const [f, setF] = useState(empty), [list, setList] = useState([]), [errs, setErrs] = useState({}), [e, setE] = useState(""), [editId, setEditId] = useState(null), [saved, setSaved] = useState("");
  const [page, setPage] = useState(1), [token, setToken] = useState(""), [m, setM] = useState(null), [scan, setScan] = useState(false);
  const load = () => api("/api/my/offers").then(setList).catch(x => setE(x.message));
  useEffect(() => { load(); }, []);
  const set = k => ev => setF({ ...f, [k]: ev.target.value });
  const cls = k => errs[k] ? "invalid" : "";
  const basket = f.category === BASKET;
  const check = () => {
    const x = {};
    if (f.title.trim().length < 2) x.title = "Titre obligatoire (2 caractères minimum).";
    if (!(+f.originalPrice > 0)) x.originalPrice = basket ? "Valeur estimée > 0." : "Prix initial > 0.";
    if (!(+f.price > 0)) x.price = "Prix réduit > 0."; else if (+f.price >= +f.originalPrice) x.price = basket ? "Doit être inférieur à la valeur estimée." : "Doit être inférieur au prix initial.";
    if (!(Number.isInteger(+f.quantity) && +f.quantity >= 1)) x.quantity = "Quantité entière ≥ 1.";
    if (f.photo && !/^(https?:\/\/|data:image\/)/.test(f.photo)) x.photo = "Photo invalide.";
    if (f.pickupTo <= f.pickupFrom) x.pickupTo = "L'heure de fin doit être après le début.";
    if (f.description.length > 300) x.description = "300 caractères maximum.";
    return x;
  };
  const pickPhoto = async ev => {
    const file = ev.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) return setErrs({ ...errs, photo: "Choisis un fichier image." });
    try { setF({ ...f, photo: await fileToDataUrl(file) }); setErrs({ ...errs, photo: undefined }); } catch { setErrs({ ...errs, photo: "Impossible de lire cette image." }); }
  };
  const save = async ev => {
    ev.preventDefault(); setE(""); setSaved("");
    const x = check(); setErrs(x); if (Object.keys(x).length) return;
    try {
      const body = { title: f.title, category: f.category, description: f.description, photo: f.photo, originalPrice: +f.originalPrice, price: +f.price, quantity: +f.quantity, pickupFrom: f.pickupFrom, pickupTo: f.pickupTo };
      await api(editId ? `/api/offers/${editId}` : "/api/offers", { method: editId ? "PUT" : "POST", body });
      setSaved(editId ? "Offre mise à jour." : "Offre publiée : elle est visible dans le catalogue."); setF(empty); setEditId(null); load();
    } catch (x) { setE(x.message); }
  };
  const edit = o => { const { id, shopId, createdAt, sold, ...rest } = o; setEditId(id); setErrs({}); setSaved(""); setF({ ...empty, ...rest, description: rest.description || "", category: CATEGORIES.includes(rest.category) ? rest.category : "Autre" }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const redeem = async tok => {
    setM(null);
    try { const r = await api("/api/orders/validate", { method: "POST", body: { token: tok.trim() } }); setM({ ok: true, t: `Validé : ${r.title} × ${r.quantity}${r.studentName ? ` (${r.studentName})` : ""}. +${r.points} EcoPoints pour l'étudiant.${r.outsideSlot ? ` Attention : retrait hors du créneau prévu (${r.slot}).` : ""}` }); setToken(""); }
    catch (x) { setM({ ok: false, t: x.message }); }
  };
  const preview = { id: "preview", title: f.title || "Titre de l'offre", category: f.category, description: f.description, photo: f.photo, originalPrice: +f.originalPrice || 10, price: +f.price || 5, quantity: +f.quantity || 5, pickupFrom: f.pickupFrom, pickupTo: f.pickupTo, shopName: me.shop?.name || "Mon commerce", createdAt: Date.now(), sold: 0 };

  return <div className="page">
    <header className="page-head"><h1>{me.shop?.name}</h1><p>Publie tes invendus, suis le stock et valide les retraits.</p></header>
    {!me.shop?.approved && <p className="note warn"><Icon name="shield" size={18} />Ton commerce attend la validation de l'administrateur avant de publier des offres.</p>}
    <div className="panel scan"><h3><Icon name="qr" size={20} />Valider un retrait</h3>
      <form className="filters" onSubmit={ev => { ev.preventDefault(); redeem(token); }}>
        <input aria-label="Code du QR" placeholder="Code du QR (ou résultat du scan)" value={token} onChange={e => setToken(e.target.value)} />
        <button className="btn">Valider</button>
        <button type="button" className="btn ghost" onClick={() => setScan(!scan)}><Icon name="cam" size={18} />{scan ? "Fermer la caméra" : "Scanner"}</button></form>
      {scan && <Scanner onScan={t => { setScan(false); redeem(t); }} onFail={t => { setScan(false); setM({ ok: false, t }); }} />}
      {m && <p className={m.ok ? "ok" : "err"} role="status">{m.t}</p>}
      <p className="muted"><Link to="/orders" className="link">Voir toutes les commandes</Link></p></div>

    <div className="editor">
      <form className="panel" onSubmit={save} noValidate><h3>{editId ? "Modifier l'offre" : "Nouvelle offre"}</h3>
        <div className="form-grid">
          <Field label="Titre" error={errs.title}><input className={cls("title")} value={f.title} onChange={set("title")} /></Field>
          <Field label="Catégorie" hint={basket ? "Panier surprise : le contenu est révélé au retrait." : ""}><select value={f.category} onChange={set("category")}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label={basket ? "Valeur estimée du contenu (TND)" : "Prix initial (TND)"} error={errs.originalPrice}><input className={cls("originalPrice")} type="number" step="0.001" min="0" value={f.originalPrice} onChange={set("originalPrice")} /></Field>
          <Field label="Prix réduit (TND)" error={errs.price}><input className={cls("price")} type="number" step="0.001" min="0" value={f.price} onChange={set("price")} /></Field>
          <Field label="Quantité" error={errs.quantity}><input className={cls("quantity")} type="number" min="1" value={f.quantity} onChange={set("quantity")} /></Field>
          <Field label="Retrait à partir de"><input type="time" value={f.pickupFrom} onChange={set("pickupFrom")} /></Field>
          <Field label="Retrait jusqu'à" error={errs.pickupTo}><input className={cls("pickupTo")} type="time" value={f.pickupTo} onChange={set("pickupTo")} /></Field></div>
        <Field label={basket ? "Indice sur le contenu (facultatif)" : "Description (facultatif)"} error={errs.description} hint={`${f.description.length}/300`}><textarea rows="3" maxLength={300} className={cls("description")} value={f.description} onChange={set("description")} placeholder={basket ? "Ex. : pains, viennoiseries et pâtisseries du jour" : "Ex. : pur beurre, cuit ce matin"} /></Field>
        <Field label="Photo" error={errs.photo} hint="Choisis une image : elle est redimensionnée automatiquement.">
          <div className="photo-pick"><input type="file" accept="image/*" onChange={pickPhoto} />{f.photo && <button type="button" className="btn small ghost" onClick={() => setF({ ...f, photo: "" })}>Retirer la photo</button>}</div></Field>
        <Err e={e} />{saved && <p className="ok" role="status">{saved}</p>}
        <div><button className="btn">{editId ? "Enregistrer" : "Publier l'offre"}</button>{editId && <> <button type="button" className="btn ghost" onClick={() => { setEditId(null); setF(empty); setErrs({}); }}>Annuler</button></>}</div></form>
      <aside className="preview" aria-label="Aperçu de l'offre"><p className="muted">Aperçu tel que les étudiants le verront</p><OfferCard o={preview} /></aside>
    </div>

    <h2 className="sub">Mes offres</h2>
    {list.length ? paginate(list, page, 6).map(o => <div className="panel row" key={o.id}><span><b>{o.title}</b> — {fmt(o.price)} TND ({o.quantity > 0 ? `${o.quantity} en stock` : "épuisée"}){o.category === BASKET ? " · panier surprise" : ""}</span>
      <span><button className="link" onClick={() => edit(o)}>Modifier</button>
        <button className="link danger" onClick={async () => { if (window.confirm(`Supprimer « ${o.title} » ?`)) { await api(`/api/offers/${o.id}`, { method: "DELETE" }); load(); } }}>Supprimer</button></span></div>)
      : <Empty title="Aucune offre publiée" text="Publie ta première offre avec le formulaire ci-dessus : elle apparaîtra aussitôt dans le catalogue." />}
    <Pager page={Math.min(page, Math.ceil(list.length / 6) || 1)} pages={Math.ceil(list.length / 6)} onChange={setPage} />
  </div>;
}
