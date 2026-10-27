import QRCode from "qrcode";

export async function ticketQrDataUrl(code: string) {
  const svg = await QRCode.toString(code, {
    type: "svg", errorCorrectionLevel: "M", margin: 4, width: 280,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
