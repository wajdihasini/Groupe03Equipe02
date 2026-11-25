// Modèle « utilisateur » : toutes les méthodes d'accès à la collection users (select, insert, update).
import { db, FieldValue } from "../config/firebase.js";
import { listOf } from "../utils/http.js";

const users = () => db.collection("users");
export const ref = (uid) => users().doc(uid);

// Renvoie les données de l'utilisateur, ou null s'il n'existe pas.
export async function findById(uid) {
  const snap = await ref(uid).get();
  return snap.exists ? snap.data() : null;
}
export const findAll = async () => listOf(await users().get());
export const findByRole = async (role) => listOf(await users().where("role", "==", role).get());

export const create = (uid, data) => ref(uid).set(data);
export const update = (uid, data) => ref(uid).update(data);

export const addFcmToken = (uid, token) => update(uid, { fcmTokens: FieldValue.arrayUnion(token) });
export const removeFcmTokens = (uid, tokens) => update(uid, { fcmTokens: FieldValue.arrayRemove(...tokens) });
