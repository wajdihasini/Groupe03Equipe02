// Doublure EN MÉMOIRE de « firebase-admin », utilisée UNIQUEMENT par les tests (jamais par l'application).
// Elle est branchée par tests/setup.mjs grâce à un hook de résolution de modules Node :
// le code de production (src/) reste inchangé et continue d'utiliser le vrai Firebase.
// Seul le sous-ensemble de l'API utilisé par le backend est reproduit.

const clone = (v) => (v === undefined ? undefined : structuredClone(v));
let autoId = 0;

class Sentinel { constructor(kind, value) { this.kind = kind; this.value = value; } }
const FieldValue = {
  increment: (n) => new Sentinel("increment", n),
  arrayUnion: (...v) => new Sentinel("arrayUnion", v),
  arrayRemove: (...v) => new Sentinel("arrayRemove", v),
  delete: () => new Sentinel("delete"),
};
const applyField = (current, value) => {
  if (!(value instanceof Sentinel)) return clone(value);
  if (value.kind === "increment") return (typeof current === "number" ? current : 0) + value.value;
  if (value.kind === "arrayUnion") { const a = Array.isArray(current) ? [...current] : []; value.value.forEach(x => { if (!a.includes(x)) a.push(x); }); return a; }
  if (value.kind === "arrayRemove") return (Array.isArray(current) ? current : []).filter(x => !value.value.includes(x));
  return undefined;
};
const merge = (base, data) => {
  const out = { ...(base || {}) };
  for (const [k, v] of Object.entries(data)) {
    const nv = applyField(out[k], v);
    if (v instanceof Sentinel && v.kind === "delete") delete out[k]; else out[k] = nv;
  }
  return out;
};

class NotFound extends Error { constructor(path) { super(`5 NOT_FOUND: No document to update: ${path}`); this.code = 5; } }

class DocSnap {
  constructor(ref, data) { this.ref = ref; this.id = ref.id; this._d = data; this.exists = data !== undefined; }
  data() { return clone(this._d); }
  get(f) { return this._d?.[f]; }
}
class QuerySnap {
  constructor(docs) { this.docs = docs; this.size = docs.length; this.empty = docs.length === 0; }
  forEach(fn) { this.docs.forEach(fn); }
}

class DocRef {
  constructor(db, col, id) { this.db = db; this.col = col; this.id = id; this.path = `${col}/${id}`; }
  _store() { return this.db._col(this.col); }
  async get() { await tick(); return new DocSnap(this, clone(this._store().get(this.id))); }
  async set(data, opts) { await tick(); this._set(data, opts); }
  async update(data) { await tick(); this._update(data); }
  async delete() { await tick(); this._store().delete(this.id); }
  _set(data, opts) { const s = this._store(); s.set(this.id, opts?.merge ? merge(s.get(this.id), data) : merge({}, data)); }
  _update(data) { const s = this._store(); if (!s.has(this.id)) throw new NotFound(this.path); s.set(this.id, merge(s.get(this.id), data)); }
}

class Query {
  constructor(db, col, filters = [], lim = null) { this.db = db; this.col = col; this.filters = filters; this.lim = lim; }
  where(field, op, value) { return new Query(this.db, this.col, [...this.filters, [field, op, value]], this.lim); }
  limit(n) { return new Query(this.db, this.col, this.filters, n); }
  _match(d) {
    return this.filters.every(([f, op, v]) => {
      const x = d[f];
      if (op === "==") return x === v;
      if (op === "in") return v.includes(x);
      if (op === ">") return x !== undefined && x > v;
      if (op === ">=") return x !== undefined && x >= v;
      if (op === "<") return x !== undefined && x < v;
      throw new Error(`Opérateur non géré par la doublure : ${op}`);
    });
  }
  _docs() {
    let docs = [...this.db._col(this.col).entries()].filter(([, d]) => this._match(d)).map(([id, d]) => new DocSnap(new DocRef(this.db, this.col, id), clone(d)));
    if (this.lim != null) docs = docs.slice(0, this.lim);
    return docs;
  }
  async get() { await tick(); return new QuerySnap(this._docs()); }
  count() { return { get: async () => { await tick(); const n = this._docs().length; return { data: () => ({ count: n }) }; } }; }
}
class ColRef extends Query {
  constructor(db, col) { super(db, col); }
  doc(id) { return new DocRef(this.db, this.col, id || `auto${++autoId}${Math.random().toString(36).slice(2, 8)}`); }
  async add(data) { const ref = this.doc(); await ref.set(data); return ref; }
}

// Transactions : sérialisées (verrou) pour reproduire l'atomicité de Firestore ; écritures appliquées au commit.
// Petite latence aléatoire (0 à 4 ms) pour imiter le réseau : rend visibles les accès concurrents.
const tick = () => new Promise(r => setTimeout(r, Math.random() * 4));
class Firestore {
  constructor() { this.data = new Map(); this._lock = Promise.resolve(); }
  _col(name) { if (!this.data.has(name)) this.data.set(name, new Map()); return this.data.get(name); }
  collection(name) { return new ColRef(this, name); }
  async getAll(...refs) { await tick(); return refs.map(r => new DocSnap(r, clone(r._store().get(r.id)))); }
  runTransaction(fn) {
    const run = async () => {
      const writes = [];
      const t = {
        get: async (x) => (x instanceof DocRef ? new DocSnap(x, clone(x._store().get(x.id))) : new QuerySnap(x._docs())),
        set: (ref, data, opts) => { writes.push(() => ref._set(data, opts)); return t; },
        update: (ref, data) => { writes.push(() => ref._update(data)); return t; },
        delete: (ref) => { writes.push(() => ref._store().delete(ref.id)); return t; },
      };
      const result = await fn(t);
      writes.forEach(w => w());
      return result;
    };
    const p = this._lock.then(run, run);
    this._lock = p.catch(() => {});
    return p;
  }
  reset() { this.data.clear(); }
  dump(col) { return Object.fromEntries([...this._col(col).entries()].map(([k, v]) => [k, clone(v)])); }
}

// Auth : un jeton de test a la forme « test:<uid>:<email> » (optionnel « :<auth_time> »).
class Auth {
  constructor() { this.users = new Map(); }
  async verifyIdToken(token) {
    const m = /^test:([^:]+):([^:]+)(?::(\d+))?$/.exec(token || "");
    if (!m) { const e = new Error("Decoding Firebase ID token failed"); e.code = "auth/argument-error"; throw e; }
    return { uid: m[1], email: m[2], auth_time: m[3] ? +m[3] : Math.floor(Date.now() / 1000) };
  }
  async updateUser(uid, props) {
    if (props.email) for (const [id, u] of this.users) if (id !== uid && u.email === props.email) { const e = new Error("exists"); e.code = "auth/email-already-exists"; throw e; }
    this.users.set(uid, { ...(this.users.get(uid) || {}), ...props });
    return { uid, ...props };
  }
}

const db = new Firestore(), auth = new Auth();
export const sentMessages = [];
const messaging = { async sendEachForMulticast(msg) { sentMessages.push(msg); return { responses: msg.tokens.map(() => ({ success: true })) }; } };

const firestore = () => db; firestore.FieldValue = FieldValue;
const admin = {
  apps: [],
  initializeApp() { this.apps.push({}); return {}; },
  credential: { applicationDefault: () => ({}), cert: () => ({}) },
  firestore, auth: () => auth, messaging: () => messaging,
  __fake: { db, auth, sentMessages },
};
export default admin;
export { db, auth, FieldValue };
