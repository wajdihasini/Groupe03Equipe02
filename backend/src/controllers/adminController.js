// Contrôleur « administrateur » : validation des commerces, blocage des comptes, supervision.
import { asyncHandler, dayKey, newest, sum } from "../utils/http.js";
import { notify } from "../services/notificationService.js";
import * as userModel from "../models/userModel.js";
import * as shopModel from "../models/shopModel.js";
import * as offerModel from "../models/offerModel.js";
import * as orderModel from "../models/orderModel.js";

const shopNames = (shops) => Object.fromEntries(shops.map(s => [s.id, s.name]));
const isDone = (o) => ["paid", "collected"].includes(o.status);

// GET /api/admin/shops
export const shops = asyncHandler(async (req, res) => res.json(await shopModel.findAll()));

// PATCH /api/admin/shops/:id — valider / suspendre un commerce.
export const approveShop = asyncHandler(async (req, res) => {
  if (!(await shopModel.findById(req.params.id))) return res.status(404).json({ error: "Commerce introuvable" });
  await shopModel.update(req.params.id, { approved: req.body.approved });
  if (req.body.approved) notify(req.params.id, "Commerce validé", "Votre commerce est validé : vous pouvez publier vos offres.");
  res.json({ ok: true });
});

// GET /api/admin/users — sans les jetons FCM, plus récents d'abord.
export const users = asyncHandler(async (req, res) => {
  res.json((await userModel.findAll()).map(({ fcmTokens, ...u }) => u).sort((a, b) => b.createdAt - a.createdAt));
});

// PATCH /api/admin/users/:id — bloquer / débloquer un compte.
export const blockUser = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
  if (user.role === "admin") return res.status(400).json({ error: "Impossible de bloquer un administrateur" });
  await userModel.update(req.params.id, { blocked: req.body.blocked });
  if (user.role === "merchant" && req.body.blocked) await shopModel.update(req.params.id, { approved: false }); // ses offres disparaissent
  res.json({ ok: true });
});

// GET /api/admin/overview — vue d'ensemble de la plateforme.
export const overview = asyncHandler(async (req, res) => {
  const [allUsers, allShops, orders, offers] = await Promise.all([userModel.findAll(), shopModel.findAll(), orderModel.findAll(), offerModel.findAll()]);
  const shopName = shopNames(allShops), done = orders.filter(isDone), today = dayKey(Date.now());
  const days = Array.from({ length: 14 }, (_, i) => dayKey(Date.now() - (13 - i) * 864e5));
  const rev = {};
  done.forEach(o => { rev[o.shopId] = (rev[o.shopId] || 0) + o.total; });
  res.json({
    kpis: { users: allUsers.length, students: allUsers.filter(u => u.role === "student").length, merchants: allUsers.filter(u => u.role === "merchant").length, blocked: allUsers.filter(u => u.blocked).length,
      shopsApproved: allShops.filter(s => s.approved).length, shopsPending: allShops.filter(s => !s.approved).length, offersActive: offers.filter(o => o.quantity > 0).length, offersTotal: offers.length,
      ordersTotal: orders.length, ordersToday: orders.filter(o => dayKey(o.createdAt) === today).length, toCollect: orders.filter(o => o.status === "paid").length,
      revenue: +sum(done, o => o.total).toFixed(3), meals: sum(orders.filter(o => o.status === "collected"), o => o.quantity), savings: +sum(done, o => (o.originalTotal || o.total) - o.total).toFixed(3) },
    byDay: days.map(date => { const d = done.filter(o => dayKey(o.paidAt || o.createdAt) === date); return { date, orders: d.length, revenue: +sum(d, o => o.total).toFixed(3) }; }),
    statusCounts: orders.reduce((c, o) => ({ ...c, [o.status]: (c[o.status] || 0) + 1 }), {}),
    pendingShops: allShops.filter(s => !s.approved).sort(newest).map(({ id, name, address, phone, createdAt }) => ({ id, name, address, phone, createdAt })),
    recentUsers: allUsers.sort(newest).slice(0, 6).map(({ id, name, email, role, createdAt, blocked }) => ({ id, name, email, role, createdAt, blocked })),
    recentOrders: orders.sort(newest).slice(0, 8).map(o => ({ id: o.id, title: o.title, quantity: o.quantity, total: o.total, status: o.status, studentName: o.studentName, shopName: shopName[o.shopId], createdAt: o.createdAt })),
    topShops: Object.entries(rev).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, t]) => ({ id, name: shopName[id] || "—", revenue: +t.toFixed(3) })),
  });
});

// GET /api/admin/orders — 500 dernières commandes (sans QR ni référence de paiement).
export const orders = asyncHandler(async (req, res) => {
  const [list, allShops] = await Promise.all([orderModel.findAll(), shopModel.findAll()]);
  const shopName = shopNames(allShops);
  res.json(list.sort(newest).slice(0, 500).map(({ qrToken, paymentRef, ...o }) => ({ ...o, shopName: shopName[o.shopId] || "—" })));
});

// GET /api/admin/offers — toutes les offres (photo remplacée par hasPhoto pour alléger la réponse).
export const offers = asyncHandler(async (req, res) => {
  const [list, allShops] = await Promise.all([offerModel.findAll(), shopModel.findAll()]);
  const shopName = shopNames(allShops);
  res.json(list.sort(newest).map(({ photo, ...o }) => ({ ...o, hasPhoto: !!photo, shopName: shopName[o.shopId] || "—" })));
});

// DELETE /api/admin/offers/:id — modération.
export const deleteOffer = asyncHandler(async (req, res) => {
  await offerModel.remove(req.params.id);
  res.json({ ok: true });
});
