import nodemailer from "nodemailer";

// Configure from .env — leave empty to disable email
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

export async function sendApprovalNotification(title: string, submittedBy: string, detail: string): Promise<boolean> {
  if (!transporter || !process.env.NOTIFY_EMAIL) {
    console.log("[email] SMTP not configured — skipping notification");
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "mcp@mygreensquares.com",
      to: process.env.NOTIFY_EMAIL,
      subject: `[mcp] new approval required: ${title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px;">
          <h3 style="color: #6ab023; text-transform: lowercase;">new approval required</h3>
          <p><strong>title:</strong> ${title}</p>
          <p><strong>submitted by:</strong> ${submittedBy}</p>
          <p><strong>detail:</strong> ${detail}</p>
          <p style="margin-top: 20px;">
            <a href="https://bmcewan.co.uk/#/approvals" style="background: #6ab023; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; text-transform: lowercase;">view in mcp</a>
          </p>
        </div>
      `,
    });
    console.log(`[email] Approval notification sent for: ${title}`);
    return true;
  } catch (err) {
    console.error("[email] Failed to send notification:", err);
    return false;
  }
}

export async function sendCascadeNotification(oldPrice: number, newPrice: number, flaggedDeals: number): Promise<boolean> {
  if (!transporter || !process.env.NOTIFY_EMAIL) {
    console.log("[email] SMTP not configured — skipping notification");
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "mcp@mygreensquares.com",
      to: process.env.NOTIFY_EMAIL,
      subject: `[mcp] base price cascade: £${oldPrice} → £${newPrice}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px;">
          <h3 style="color: #6ab023; text-transform: lowercase;">base price cascade triggered</h3>
          <p><strong>old price:</strong> £${oldPrice.toFixed(4)}</p>
          <p><strong>new price:</strong> £${newPrice.toFixed(4)}</p>
          <p><strong>deals flagged for review:</strong> ${flaggedDeals}</p>
          <p style="margin-top: 20px;">
            <a href="https://bmcewan.co.uk/#/pricing" style="background: #6ab023; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; text-transform: lowercase;">review in mcp</a>
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send cascade notification:", err);
    return false;
  }
}
