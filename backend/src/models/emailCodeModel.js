// Modèle « code de vérification e-mail » : collection emailCodes (un document par utilisateur, code haché).
import { db } from "../config/firebase.js";

const ref = (uid) => db.collection("emailCodes").doc(uid);

export const findByUser = async (uid) => (await ref(uid).get()).data() || null;
export const save = (uid, data) => ref(uid).set(data);
export const update = (uid, data) => ref(uid).update(data);
export const remove = (uid) => ref(uid).delete();
