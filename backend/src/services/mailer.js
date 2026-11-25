// Envoi des e-mails (code de vérification) via SMTP avec nodemailer.
// Variables d'environnement : SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM.
// Sans SMTP configuré (hors production) : le code est affiché dans le terminal du backend, aucun e-mail n'est envoyé.
export const outbox = []; // utilisé uniquement par les tests (NODE_ENV=test)
let transport;
const configured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function getTransport() {
  if (transport) return transport;
  let nodemailer;
  try { ({ default: nodemailer } = await import("nodemailer")); }
  catch { throw new Error("Le module nodemailer est absent : lance « npm install nodemailer » dans le dossier backend."); }
  const port = +(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE === "true" || port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  return transport;
}

export async function sendVerificationCode({ to, name, code, minutes }) {
  if (process.env.NODE_ENV === "test") { outbox.push({ to, code }); return { sent: true }; }
  if (!configured()) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP non configuré");
    console.log(`\n[MODE DÉVELOPPEMENT] SMTP non configuré : aucun e-mail envoyé.\n    Code de vérification pour ${to} : ${code}\n`);
    return { sent: false, dev: true };
  }
  const text = `Bonjour ${name || ""},\n\nTon code de vérification CampusSave est : ${code}\nIl est valable ${minutes} minutes.\n\nSi tu n'as pas créé de compte, ignore cet e-mail.`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fc;padding:24px"><div style="max-width:480px;margin:auto;background:#fff;border:2px solid #0f1b3d;border-radius:16px;padding:28px;color:#0f1b3d">
    <h1 style="font-size:22px;color:#1d46e0;margin:0 0 14px">CampusSave</h1><p>Bonjour ${esc(name)},</p><p>Voici ton code de vérification :</p>
    <p style="font-size:34px;letter-spacing:10px;font-weight:bold;text-align:center;background:#ffd84d;border:2px solid #0f1b3d;border-radius:12px;padding:14px 0;margin:18px 0">${code}</p>
    <p style="color:#56628a;font-size:14px">Il est valable ${minutes} minutes. Si tu n'as pas créé de compte CampusSave, ignore simplement cet e-mail.</p></div></div>`;
  await (await getTransport()).sendMail({ from: process.env.MAIL_FROM || `CampusSave <${process.env.SMTP_USER}>`, to, subject: `${code} est ton code de vérification CampusSave`, text, html });
  return { sent: true };
}
