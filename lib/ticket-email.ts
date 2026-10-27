import { createHash } from "node:crypto";
import QRCode from "qrcode";
import type { PublicTicket } from "./ticket";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

// Called only on the server, with the ticket read back from the database.
export async function sendTicketEmail(
  ticket: PublicTicket,
  config: { apiKey?: string; from?: string },
  request: typeof fetch = fetch,
) {
  if (!config.apiKey?.trim() || !config.from?.trim()) {
    throw new Error("Ticket email configuration is missing");
  }

  const date = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full", timeStyle: "short", timeZone: "America/Mexico_City", hourCycle: "h23",
  }).format(new Date(ticket.event.starts_at));
  const dateLabel = `${date} (hora de Ciudad de México)`;
  // Email clients support inline PNG attachments more widely than SVG/data URIs.
  const qr = await QRCode.toBuffer(ticket.code, {
    type: "png", errorCorrectionLevel: "M", margin: 4, width: 320,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const e = escapeHtml;
  const body = JSON.stringify({
    from: config.from.trim(),
    to: [ticket.attendee.email],
    subject: `Tu entrada para ${ticket.event.title.replace(/[\r\n]+/g, " ")}`,
    html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f6f5ef;color:#18231f;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff"><tr><td style="padding:28px">
<p style="font-size:14px">DOOR LIST</p><h1 style="font-size:26px">¡Tu registro está confirmado!</h1>
<p>Hola, ${e(ticket.attendee.name)}. Esta es tu entrada:</p>
<h2 style="font-size:22px">${e(ticket.event.title)}</h2>
<p><strong>Fecha:</strong> ${e(dateLabel)}</p>
<p><strong>Lugar:</strong> ${e(ticket.event.venue)}</p>
<p><strong>Tipo de entrada:</strong> ${e(ticket.ticket_type.name)}</p>
<p><strong>Asistente:</strong> ${e(ticket.attendee.name)}</p>
<p>Presenta este QR al llegar al evento:</p>
<p style="text-align:center"><img src="cid:ticket-qr" alt="Código QR de tu entrada" width="280" height="280" style="display:block;width:280px;max-width:100%;height:auto;margin:0 auto"></p>
<p style="font-size:12px;word-break:break-all">Código: ${e(ticket.code)}</p>
<p style="font-size:13px">Guarda este correo y mantén tu entrada privada. El QR identifica tu entrada.</p>
</td></tr></table></td></tr></table></body></html>`,
    text: `¡Tu registro está confirmado!\nHola, ${ticket.attendee.name}.\n\nEvento: ${ticket.event.title}\nFecha: ${dateLabel}\nLugar: ${ticket.event.venue}\nTipo de entrada: ${ticket.ticket_type.name}\nAsistente: ${ticket.attendee.name}\n\nPresenta el QR incluido en este correo al llegar al evento.\nCódigo: ${ticket.code}\n\nGuarda este correo y mantén tu entrada privada.`,
    attachments: [{
      filename: "entrada-qr.png", content_type: "image/png", content_id: "ticket-qr",
      content: qr.toString("base64"),
    }],
  });
  // A lost response can be retried without sending the same ticket twice.
  // Hashing avoids exposing the bearer code itself in request headers.
  const idempotencyKey = `ticket-confirmation/${createHash("sha256").update(ticket.code).digest("hex")}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await request("https://api.resend.com/emails", {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(8_000),
        headers: {
          Authorization: `Bearer ${config.apiKey.trim()}`,
          "Content-Type": "application/json", "Idempotency-Key": idempotencyKey,
        },
        body,
      });
    } catch {
      if (attempt === 0) continue;
      throw new Error("Ticket email request failed");
    }
    if (response.ok) {
      const result = await response.json();
      if (typeof result?.id !== "string" || !result.id) throw new Error("Invalid ticket email response");
      return;
    }
    if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    // Do not log provider bodies: they may contain attendee data or credentials.
    throw new Error(`Ticket email rejected (${response.status})`);
  }
}
