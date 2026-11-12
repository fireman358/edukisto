export interface EmailEnv {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  APP_URL?: string;
}

export async function sendEmail(
  env: EmailEnv,
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY manquante" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || "Barakfix <barakfix@edukisto.win>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.status);
      return { ok: false, error: `Resend ${res.status}: ${err}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#1e293b;padding:20px 28px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;">Barakfix</h1>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;">${title}</h2>
      ${bodyHtml}
      ${cta ? `<p style="margin:24px 0 8px;"><a href="${cta.url}" style="display:inline-block;background:#1e293b;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">${cta.label}</a></p>` : ""}
    </div>
    <div style="padding:16px 28px;background:#f8fafc;color:#64748b;font-size:12px;">
      Barakfix — demandes de réparation entre bailleur et locataire
    </div>
  </div>
</body>
</html>`;
}
