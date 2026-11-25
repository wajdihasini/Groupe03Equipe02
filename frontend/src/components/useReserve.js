import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { toast } from "./ui.jsx";

// Réservation (stock décrémenté côté serveur). Le paiement se fait ensuite depuis la page Commandes.
export function useReserve(me) {
  const nav = useNavigate(), [msg, setMsg] = useState("");
  const reserve = async (o, quantity = 1) => {
    setMsg("");
    if (!me) return nav("/login");
    if (me.role !== "student") return setMsg("Seuls les comptes étudiants peuvent réserver.");
    try { await api("/api/orders", { method: "POST", body: { offerId: o.id, quantity } }); toast("Réservation créée : tu as 15 minutes pour payer."); nav("/orders"); return true; }
    catch (x) { setMsg(x.message); return false; }
  };
  return { reserve, msg, setMsg };
}
