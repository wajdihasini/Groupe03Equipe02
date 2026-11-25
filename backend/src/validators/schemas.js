// Schémas de validation (zod) des données envoyées par les formulaires du frontend.
// Le serveur revérifie toujours ce que le client envoie, même si le formulaire l'a déjà contrôlé.
import { z } from "zod";
import { CATEGORIES } from "../config/constants.js";

const PHONE_RE = /^(\+216|00216)?\s?\d{2}\s?\d{3}\s?\d{3}$/; // 8 chiffres, indicatif +216 facultatif
const PHONE_MSG = "Numéro de téléphone invalide (8 chiffres)";
const phone = z.string().trim().regex(PHONE_RE, PHONE_MSG);
const optionalPhone = phone.optional().or(z.literal(""));
const nameField = (label) => z.string().trim().min(2, `${label} trop court`).max(40);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM)");

// Inscription (le rôle admin est impossible : il n'est pas dans l'énumération).
export const profileSchema = z.object({
  firstName: nameField("Prénom"), lastName: nameField("Nom"), role: z.enum(["student", "merchant"]), phone,
  shopName: z.string().trim().min(2, "Nom du commerce requis").max(60).optional(), address: z.string().trim().max(120).optional(),
});

export const meSchema = z.object({ firstName: nameField("Prénom"), lastName: nameField("Nom"), phone, email: z.string().trim().email("E-mail invalide").max(120) });

export const shopSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(60), address: z.string().trim().max(120).optional(),
  phone: optionalPhone, description: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).nullable().optional(), lng: z.number().min(-180).max(180).nullable().optional(),
});

export const fcmTokenSchema = z.object({ token: z.string().min(20) });
export const verifyCodeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Le code contient 6 chiffres.") });

export const offerSchema = z.object({
  title: z.string().trim().min(2).max(80),
  category: z.enum(CATEGORIES),
  photo: z.string().max(400000).refine(v => v === "" || /^https?:\/\/.+/.test(v) || /^data:image\/(jpeg|png|webp);base64,/.test(v), "Photo invalide").optional(),
  description: z.string().trim().max(300).optional(),
  originalPrice: z.number().positive(), price: z.number().positive(),
  quantity: z.number().int().min(1).max(500),
  pickupFrom: hhmm, pickupTo: hhmm,
}).superRefine((o, ctx) => {
  if (o.price >= o.originalPrice) ctx.addIssue({ code: "custom", path: ["price"], message: "Le prix réduit doit être inférieur au prix initial" });
  if (o.pickupTo <= o.pickupFrom) ctx.addIssue({ code: "custom", path: ["pickupTo"], message: "L'heure de fin doit être après l'heure de début" });
});

export const reserveSchema = z.object({ offerId: z.string(), quantity: z.number().int().min(1).max(10) });
export const qrTokenSchema = z.object({ token: z.string().trim().min(8) });
export const approveSchema = z.object({ approved: z.boolean() });
export const blockSchema = z.object({ blocked: z.boolean() });
