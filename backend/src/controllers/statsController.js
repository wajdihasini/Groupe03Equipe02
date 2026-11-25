// Contrôleur « statistiques » : tableaux de bord, impact public, classement EcoPoints, recommandations.
import { asyncHandler, dayKey, sum } from "../utils/http.js";
import { availableOffers } from "../services/catalogService.js";
import * as orderModel from "../models/orderModel.js";
import * as userModel from "../models/userModel.js";
import * as shopModel from "../models/shopModel.js";
import * as offerModel from "../models/offerModel.js";

const isDone = (o) => ["paid", "collected"].includes(o.status);
const savingsOf = (orders) => +sum(orders, o => (o.originalTotal || o.total) - o.total).toFixed(3);

// GET /api/recommendations — selon les catégories et commerces des commandes passées de l'étudiant.
export const recommendations = asyncHandler(async (req, res) => {
  const mine = (await orderModel.findByStudent(req.user.uid)).filter(isDone);
  const qty = {};
  mine.forEach(o => { qty[o.offerId] = (qty[o.offerId] || 0) + o.quantity; });
  const past = await offerModel.findByIds(Object.keys(qty).slice(0, 30));
  const cats = {}, favShops = {};
  past.forEach(o => { cats[o.category] = (cats[o.category] || 0) + qty[o.id]; favShops[o.shopId] = (favShops[o.shopId] || 0) + qty[o.id]; });
  const recent = Date.now() - 48 * 3600e3;
  const list = (await availableOffers()).map(o => ({ ...o,
    score: (cats[o.category] || 0) * 3 + (favShops[o.shopId] || 0) * 2 + o.sold * 0.5 + (o.createdAt > recent ? 1 : 0),
    reason: cats[o.category] ? `Vous aimez : ${o.category}` : favShops[o.shopId] ? `Vous avez déjà commandé chez ${o.shopName}` : "Populaire en ce moment" }))
    .sort((a, b) => b.score - a.score).slice(0, 8);
  res.json(list);
});

// GET /api/impact — chiffres de la communauté (public, cache 30 s).
let impactCache = { t: 0, data: null };
export const impact = asyncHandler(async (req, res) => {
  if (impactCache.data && Date.now() - impactCache.t < 30000) return res.json(impactCache.data);
  const [collected, shops, students] = await Promise.all([orderModel.findByStatus("collected"), shopModel.findApproved(), userModel.findByRole("student")]);
  const data = { meals: sum(collected, o => o.quantity), savings: savingsOf(collected), orders: collected.length, shops: shops.length, students: students.length };
  impactCache = { t: Date.now(), data };
  res.json(data);
});

// GET /api/leaderboard — classement des étudiants (prénom + points uniquement).
export const leaderboard = asyncHandler(async (req, res) => {
  const all = (await userModel.findByRole("student"))
    .map(u => ({ id: u.id, name: (u.name || "Étudiant").split(" ")[0], points: u.ecoPoints || 0 }))
    .filter(u => u.points > 0).sort((a, b) => b.points - a.points);
  const idx = all.findIndex(u => u.id === req.user.uid);
  res.json({ top: all.slice(0, 10).map((u, i) => ({ name: u.name, points: u.points, rank: i + 1, me: u.id === req.user.uid })), myRank: idx >= 0 ? idx + 1 : null, total: all.length });
});

// GET /api/stats — tableau de bord selon le rôle (étudiant : ses commandes ; commerçant : son commerce ; admin : tout).
export const stats = asyncHandler(async (req, res) => {
  const { role, uid } = req.user;
  const all = role === "student" ? await orderModel.findByStudent(uid) : role === "merchant" ? await orderModel.findByShop(uid) : await orderModel.findAll();
  const done = all.filter(isDone);
  const days = Array.from({ length: 7 }, (_, i) => dayKey(Date.now() - (6 - i) * 864e5));
  const byDay = days.map(date => {
    const d = done.filter(o => dayKey(o.paidAt || o.createdAt) === date);
    return { date, orders: d.length, revenue: +sum(d, o => o.total).toFixed(3),
      meals: sum(all.filter(o => o.status === "collected" && dayKey(o.collectedAt || o.createdAt) === date), o => o.quantity) };
  });
  const top = {};
  done.forEach(o => { top[o.title] = (top[o.title] || 0) + o.quantity; });
  const out = {
    orders: done.length, revenue: +sum(done, o => o.total).toFixed(3),
    mealsSaved: sum(all.filter(o => o.status === "collected"), o => o.quantity), // repas réellement récupérés
    toCollect: all.filter(o => o.status === "paid").length,
    savings: savingsOf(done),
    byDay, topOffers: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([title, quantity]) => ({ title, quantity })),
    statusCounts: all.reduce((c, o) => ({ ...c, [o.status]: (c[o.status] || 0) + 1 }), {}),
  };
  if (role === "student") out.ecoPoints = req.user.ecoPoints || 0;
  if (role === "admin") {
    const [users, shops, activeOffers] = await Promise.all([userModel.findAll(), shopModel.findAll(), offerModel.countInStock()]);
    Object.assign(out, { users: users.length, students: users.filter(u => u.role === "student").length, merchants: users.filter(u => u.role === "merchant").length,
      shopsApproved: shops.filter(s => s.approved).length, shopsPending: shops.filter(s => !s.approved).length, activeOffers });
  }
  res.json(out);
});
