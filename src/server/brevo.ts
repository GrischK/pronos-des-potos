import "server-only";

type BrevoRecipient = {
  email: string;
  name?: string;
};

type SendTransactionalEmailInput = {
  to: BrevoRecipient;
  subject: string;
  htmlContent: string;
  textContent: string;
};

function getAppBaseUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function getSenderEmail() {
  return process.env.BREVO_SENDER_EMAIL ?? process.env.BREVO_FROM_EMAIL;
}

function getSenderName() {
  return process.env.BREVO_SENDER_NAME ?? "Pronos des potos";
}

async function sendViaBrevoApi(input: SendTransactionalEmailInput) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = getSenderEmail();

  if (!apiKey || !senderEmail) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[brevo] email not sent because BREVO_API_KEY or sender is missing.");
      console.info("[brevo] subject:", input.subject);
      console.info("[brevo] recipient:", input.to.email);
      return;
    }

    throw new Error("BREVO_API_KEY and BREVO_SENDER_EMAIL are required for email sending.");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: getSenderName(),
      },
      to: [input.to],
      subject: input.subject,
      htmlContent: input.htmlContent,
      textContent: input.textContent,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo email failed (${response.status}): ${errorBody}`);
  }
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetToken: string;
}) {
  const resetUrl = new URL(`/reset-password?token=${encodeURIComponent(input.resetToken)}`, getAppBaseUrl()).toString();
  const logoUrl = new URL("/logo.png", getAppBaseUrl()).toString();

  await sendViaBrevoApi({
    to: {
      email: input.to,
    },
    subject: "Réinitialise ton mot de passe",
    htmlContent: `
      <div style="margin:0;background:#f5f7f1;padding:32px 16px;font-family:Arial,sans-serif;color:#102014;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dce4d7;border-radius:24px;overflow:hidden;box-shadow:0 16px 40px rgba(16,32,20,.08);">
          <div style="padding:28px 28px 18px;text-align:center;background:linear-gradient(180deg,#f2f8ef 0%,#ffffff 100%);">
            <div style="display:inline-flex;width:72px;height:72px;align-items:center;justify-content:center;border-radius:14px;border:1px solid rgba(15,23,42,.12);background:linear-gradient(135deg,#2f7d4f 0 50%,#f05d3f 50% 100%);overflow:hidden;">
              <img src="${logoUrl}" alt="Pronos des potos" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:contain;" />
            </div>
            <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#4f6b55;font-weight:700;">Pronos des potos</p>
            <h1 style="margin:12px 0 0;font-size:26px;line-height:1.15;color:#0f2715;">Bon retour sur les terrains</h1>
          </div>
          <div style="padding:0 28px 28px;font-size:15px;line-height:1.7;color:#213126;">
            <p style="margin:0 0 18px;">Tu as demandé une réinitialisation de mot de passe pour ton compte.</p>
            <p style="margin:0 0 22px;text-align:center;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 20px;border-radius:12px;background:#166534;color:#ffffff;text-decoration:none;font-weight:700;">Réinitialiser mon mot de passe</a>
            </p>
            <p style="margin:0 0 8px;">Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :</p>
            <p style="margin:0 0 18px;word-break:break-word;">
              <a href="${resetUrl}" style="color:#0f5a31;">${resetUrl}</a>
            </p>
            <p style="margin:0;color:#5d6c61;font-size:13px;">Ce lien expire dans 1 heure.</p>
          </div>
        </div>
      </div>
    `,
    textContent: [
      "Tu as demandé une réinitialisation de mot de passe pour Pronos des potos.",
      "",
      `Réinitialiser le mot de passe : ${resetUrl}`,
      "",
      "Ce lien expire dans 1 heure.",
      "",
      "Bon retour sur les terrains.",
    ].join("\n"),
  });
}
