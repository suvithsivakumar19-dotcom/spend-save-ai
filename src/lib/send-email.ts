import { createServerFn } from "@tanstack/react-start";

export interface SendEmailInput {
  email: string;
  company: string;
  role?: string;
  teamSize?: string | number;
  auditUrl: string;
  monthlySavings: number;
  yearlySavings: number;
  summary?: string;
}

function formatCurrency(value: number | undefined): string {
  return `$${(Number(value) || 0).toLocaleString()}`;
}

/**
 * Server function to send audit report email via Resend.
 * Only runs on the server; safe to include API keys.
 */
export const sendAuditEmail = createServerFn({ method: "POST" })
  .inputValidator((input: SendEmailInput) => input)
  .handler(async (ctx) => {
    const input = ctx.data;
    const resendApiKey = process.env.RESEND_API_KEY;

    // Graceful fallback if no API key — still succeed but log warning
    if (!resendApiKey) {
      console.warn("⚠️  RESEND_API_KEY not set. Email sending is disabled. Set env var to enable.");
      return { success: true, message: "Email service not configured (dev mode)", skipped: true };
    }

    try {
      const email = String(input.email || "").trim();
      if (!email) {
        return { success: false, message: "Email address is required." };
      }

      const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const replyTo = process.env.RESEND_REPLY_TO || "onboarding@resend.dev";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject: `Your AI Spend Audit Report — Save ${formatCurrency(input.yearlySavings)}/year`,
          html: generateEmailHTML({
            ...input,
            email,
          }),
          reply_to: replyTo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Resend API error:", error);
        return { success: false, message: `Email sending failed: ${error.message}` };
      }

      const result = await response.json();
      console.log(`✅ Email sent to ${input.email}`, result);
      return { success: true, message: "Email sent successfully", id: result.id };
    } catch (err) {
      console.error("Error sending email:", err);
      return {
        success: false,
        message: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  });

function generateEmailHTML(input: SendEmailInput): string {
  const { email, company, role, teamSize, auditUrl, monthlySavings, yearlySavings, summary } =
    input;
  const monthly = Number(monthlySavings) || 0;
  const yearly = Number(yearlySavings) || 0;

  const displayTeamSize =
    teamSize ||
    (role && role.startsWith("Team Size:") ? role.replace("Team Size:", "").trim() : "");

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.5; color: #1a1a1a; }
      a { color: #8b5cf6; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa; }
      .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
      .content { background: white; padding: 30px; }
      .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
      .stat-box { background: #f0f9ff; padding: 15px; border-radius: 6px; text-align: center; }
      .stat-value { font-size: 24px; font-weight: bold; color: #059669; }
      .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px; }
      .cta-button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 6px; margin: 20px 0; font-weight: 600; text-decoration: none !important; }
      .footer { background: #fafafa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Your AI Spend Audit Report</h1>
        <p>Credex — Stop Overpaying for AI Tools</p>
      </div>
      
      <div class="content">
        <p>Hi there,</p>
        
        <p>Your audit is complete. We found <strong>${yearly > 0 ? `${formatCurrency(yearly)}/year` : "optimization"}</strong> in potential savings across your AI stack.</p>
        
        ${summary ? `<p style="margin-top: 1.2rem; font-style: italic; color: #374151; padding-left: 10px; border-left: 3px solid #8b5cf6;">"${summary}"</p>` : ""}

        <div class="stats">
          <div class="stat-box">
            <div class="stat-value">${formatCurrency(monthly)}</div>
            <div class="stat-label">Monthly Savings</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${formatCurrency(yearly)}</div>
            <div class="stat-label">Yearly Savings</div>
          </div>
        </div>
        
        <p>Your full report is ready to share — rules-based, defensible, and broken down by tool.</p>
        
        <center>
          <a href="${auditUrl}" class="cta-button">View Full Report</a>
        </center>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          <strong>Next steps:</strong><br />
          1. Review the per-tool recommendations<br />
          2. Share with your CFO or finance team<br />
          3. Re-audit any time you add a tool or change plans
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb; font-size: 13px;">
          ${company ? `<p style="margin: 4px 0;"><strong>Company:</strong> ${company}</p>` : ""}
          ${displayTeamSize ? `<p style="margin: 4px 0;"><strong>Team Size:</strong> ${displayTeamSize}</p>` : ""}
        </div>
        
        <p style="margin-top: 30px; font-size: 13px; color: #888;">
          Questions? Reply to this email or visit credex.app/faq
        </p>
      </div>
      
      <div class="footer">
        <p>© 2026 Credex. Audit logic is rule-based and verifiable.</p>
        <p style="margin-top: 10px;"><a href="https://credex.app">credex.app</a></p>
      </div>
    </div>
  </body>
</html>
  `.trim();
}
