// Modèle « commerce » : accès à la collection shops (l'id d'un commerce = uid de son commerçant).
import { db } from "../config/firebase.js";
import { listOf } from "../utils/http.js";

const shops = () => db.collection("shops");
export const ref = (id) => shops().doc(id);

export async function findById(id) {
  const snap = await ref(id).get();
  return snap.exists ? snap.data() : null;
}
export const findAll = async () => listOf(await shops().get());
export const findApproved = async () => listOf(await shops().where("approved", "==", true).get());

export const create = (id, data) => ref(id).set(data);
export const update = (id, data) => ref(id).update(data);
