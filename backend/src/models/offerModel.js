// Modèle « offre » : accès à la collection offers (produits invendus publiés par les commerces).
import { db } from "../config/firebase.js";
import { listOf, withId } from "../utils/http.js";

const offers = () => db.collection("offers");
export const ref = (id) => offers().doc(id);

// Renvoie { id, ...données } ou null.
export async function findById(id) {
  const snap = await ref(id).get();
  return snap.exists ? withId(snap) : null;
}
export const findAll = async () => listOf(await offers().get());
export const findByShop = async (shopId) => listOf(await offers().where("shopId", "==", shopId).get());
export const findInStock = async () => listOf(await offers().where("quantity", ">", 0).get());
export const countInStock = async () => (await offers().where("quantity", ">", 0).count().get()).data().count;

// Plusieurs offres d'un coup (celles qui n'existent plus sont ignorées).
export async function findByIds(ids) {
  if (!ids.length) return [];
  return (await db.getAll(...ids.map(ref))).filter(d => d.exists).map(withId);
}

export async function create(data) {
  const doc = await offers().add(data);
  return doc.id;
}
export const update = (id, data) => ref(id).update(data);
export const remove = (id) => ref(id).delete();
