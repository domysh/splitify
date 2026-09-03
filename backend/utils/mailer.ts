import nodemailer from 'nodemailer';

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransporter;
}

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'splitify@localhost';

  return await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html || text,
  });
}

const mailStyles = `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #eaebf0; }
    .header { background: linear-gradient(135deg, #7a84ff, #9ba3ff); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 40px 32px; text-align: center; }
    .text { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { background: #f3f4ff; border: 1px solid #dbe0ff; border-radius: 12px; padding: 24px; margin: 32px 0; }
    .otp-code { font-size: 38px; font-weight: 700; color: #5c67ff; letter-spacing: 10px; margin: 0; font-family: monospace; }
    .footer { padding: 24px; text-align: center; background: #fafafa; border-top: 1px solid #f0f0f0; }
    .footer p { font-size: 13px; color: #9ca3af; margin: 0; }
`;

const mailLayout = (body: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>${mailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Splitify</h1>
    </div>
    <div class="content">
${body}
    </div>
    <div class="footer">
      <p>Splitify 💰 — Gestisci le tue spese di gruppo in modo semplice.</p>
    </div>
  </div>
</body>
</html>`;

/** Sends a branded email containing a one-time code, valid for `validityMinutes`. */
export async function sendOtpMail(
  to: string,
  code: string,
  opts: { subject: string; title: string; intro: string; validityMinutes: number }
) {
  const text = `${opts.intro}\nIl tuo codice è: ${code}\nQuesto codice scadrà in ${opts.validityMinutes} minuti.`;

  const html = mailLayout(`
      <p class="text" style="font-weight: 600; color: #111827;">${opts.title}</p>
      <p class="text">${opts.intro}</p>
      <div class="otp-box">
        <p class="otp-code">${code}</p>
      </div>
      <p class="text" style="font-size: 14px; color: #6b7280;">Questo codice scade tra <strong>${opts.validityMinutes} minuti</strong>. Se non hai richiesto tu l'operazione, puoi ignorare in sicurezza questa email.</p>`);

  return await sendMail(to, opts.subject, text, html);
}

/** Sends a branded informational email (no code), used for security notifications. */
export async function sendInfoMail(
  to: string,
  opts: { subject: string; title: string; body: string }
) {
  const text = `${opts.title}\n\n${opts.body}`;
  const html = mailLayout(`
      <p class="text" style="font-weight: 600; color: #111827;">${opts.title}</p>
      <p class="text">${opts.body}</p>`);

  return await sendMail(to, opts.subject, text, html);
}
