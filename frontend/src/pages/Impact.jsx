import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ECO_LEVELS, IMPACT, ecoLevel } from "../config.js";
import { BarChart, CountUp, Err, Icon, useTitle } from "../components/ui.jsx";

const kg = (meals) => meals * IMPACT.kgPerMeal, co2 = (meals) => kg(meals) * IMPACT.co2PerKg;

// Bonus Impact Dashboard + EcoPoints.
export default function Impact({ me }) {
  useTitle("Impact et EcoPoints");
  const [c, setC] = useState(null), [mine, setMine] = useState(null), [lb, setLb] = useState(null), [err, setErr] = useState("");
  useEffect(() => {
    api("/api/impact").then(setC).catch(x => setErr(x.message));
    if (me && me.role !== "admin") api("/api/stats").then(setMine).catch(() => {});
    if (me) api("/api/leaderboard").then(setLb).catch(() => {});
  }, [me?.uid]);
  const pts = mine?.ecoPoints ?? me?.ecoPoints ?? 0; // les points affichés viennent de /api/stats (à jour)
  const lvl = me?.role === "student" ? ecoLevel(pts) : null;

  return <div className="page">
    <header className="page-head"><h1>Impact et EcoPoints</h1><p>Chaque repas récupéré est un repas qui n'est pas jeté. Voici ce que la communauté CampusSave a déjà évité.</p></header>
    <Err e={err} />
    {c && <section className="impact-hero">
      <div className="big"><b><CountUp to={c.meals} /></b><span>repas sauvés du gaspillage</span></div>
      <dl><div><dt><CountUp to={kg(c.meals)} decimals={1} suffix=" kg" /></dt><dd>de nourriture sauvée</dd></div>
        <div><dt><CountUp to={co2(c.meals)} decimals={1} suffix=" kg" /></dt><dd>de CO₂e évités</dd></div>
        <div><dt><CountUp to={c.savings} suffix=" TND" /></dt><dd>économisés par les étudiants</dd></div>
        <div><dt><CountUp to={c.shops} /></dt><dd>commerces partenaires</dd></div></dl>
      <p className="fine">Estimations indicatives : {IMPACT.kgPerMeal} kg de nourriture par repas et {IMPACT.co2PerKg} kg de CO₂e par kg. Seuls les repas réellement retirés sont comptés.</p></section>}

    {mine && <section className="block"><div className="block-head"><div><h2>{me.role === "merchant" ? "L'impact de ton commerce" : "Ton impact"}</h2></div></div>
      <div className="grid cols4">{[[mine.mealsSaved, "repas sauvés", 0, ""], [kg(mine.mealsSaved), "de nourriture sauvée", 1, " kg"], [co2(mine.mealsSaved), "de CO₂e évités", 1, " kg"], [mine.savings, me.role === "merchant" ? "de réductions accordées" : "économisés", 2, " TND"]]
        .map(([v, l, d, s]) => <div className="panel stat" key={l}><h2><CountUp to={v} decimals={d} suffix={s} /></h2><p>{l}</p></div>)}</div>
      <BarChart data={mine.byDay} k="meals" label="Repas retirés (7 derniers jours)" /></section>}

    {lvl && <section className="block eco">
      <div className="block-head"><div><h2>Tes EcoPoints</h2><p>10 points par repas récupéré, ajoutés quand le commerçant valide ton QR code.</p></div></div>
      <div className="eco-card" style={{ "--lvl": lvl.color }}><div className="eco-badge"><Icon name="leaf" size={34} /></div>
        <div className="eco-main"><h3>{lvl.name}</h3><p className="eco-pts"><b><CountUp to={pts} /></b> points</p>
          <div className="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(lvl.progress * 100)}><i style={{ width: `${Math.round(lvl.progress * 100)}%` }} /></div>
          <p className="muted">{lvl.next ? `Encore ${lvl.toNext} points pour devenir ${lvl.next.name}.` : "Niveau maximum atteint, bravo !"}</p></div></div>
      <ol className="levels">{ECO_LEVELS.map(l => <li key={l.name} className={pts >= l.min ? "done" : ""} style={{ "--lvl": l.color }}><b>{l.name}</b><span>{l.min} pts</span></li>)}</ol></section>}

    <section className="block"><div className="block-head"><div><h2>Classement des étudiants</h2><p>Seuls les prénoms et les points sont affichés.</p></div></div>
      {!me ? <div className="panel"><p>Connecte-toi pour voir le classement et gagner tes propres EcoPoints.</p><Link className="btn" to="/login">Se connecter</Link></div>
        : lb && lb.top.length ? <>
          <ol className="board">{lb.top.map(r => <li key={r.rank} className={r.me ? "me" : ""}><span className="rank">{r.rank}</span><b>{r.name}{r.me ? " (toi)" : ""}</b><span>{ecoLevel(r.points).name}</span><em>{r.points} pts</em></li>)}</ol>
          {lb.myRank && lb.myRank > 10 && <p className="muted">Tu es {lb.myRank}e sur {lb.total}.</p>}</>
        : <div className="panel"><p>Personne n'a encore de points. Récupère une commande pour ouvrir le classement.</p><Link className="btn" to="/catalog">Voir le catalogue</Link></div>}
    </section></div>;
}
