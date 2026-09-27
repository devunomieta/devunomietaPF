/**
 * Bulletproof cross-client email template engine with dark & light mode support.
 * Complies with RFC email standards, Outlook table fallbacks, and Apple Mail / Gmail media queries.
 */

export type EmailTemplateOptions = {
  subject: string;
  contentHtml: string;
  previewText?: string;
  brandName?: string;
  senderAddress?: string;
  unsubscribeUrl?: string;
};

/**
 * Wraps raw email HTML content inside a bulletproof, mobile-responsive,
 * dual-theme (light/dark mode aware) email container.
 */
export function renderBulletproofEmail({
  subject,
  contentHtml,
  previewText = "",
  brandName = "Joseph Unomieta",
  senderAddress = "",
  unsubscribeUrl = "#unsubscribe",
}: EmailTemplateOptions): string {
  // Clean preview text for email client snippet preview
  const safePreviewText = previewText || subject;

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* CSS Reset */
    html, body {
      margin: 0 auto !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    * {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    div[style*="margin: 16px 0"] {
      margin: 0 !important;
    }
    table, td {
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    table {
      border-spacing: 0 !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      margin: 0 auto !important;
    }
    img {
      -ms-interpolation-mode: bicubic;
      max-width: 100%;
      height: auto;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    a {
      text-decoration: underline;
      color: #2563eb;
    }

    /* Light Theme (Default) */
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body, .email-body-bg {
      background-color: #f3f4f6;
    }
    .email-container {
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      color: #1f2937;
    }
    .email-text {
      color: #374151 !important;
    }
    .email-heading {
      color: #111827 !important;
    }
    .email-muted {
      color: #6b7280 !important;
    }
    .email-card-bg {
      background-color: #f9fafb !important;
      border: 1px solid #e5e7eb !important;
    }
    .email-btn-primary {
      background-color: #2563eb !important;
      color: #ffffff !important;
    }

    /* Dark Mode Support via media query */
    @media (prefers-color-scheme: dark) {
      body, .email-body-bg {
        background-color: #0b0f19 !important;
      }
      .email-container {
        background-color: #111827 !important;
        border-color: #1f2937 !important;
        color: #f3f4f6 !important;
      }
      .email-text {
        color: #d1d5db !important;
      }
      .email-heading {
        color: #f9fafb !important;
      }
      .email-muted {
        color: #9ca3af !important;
      }
      .email-card-bg {
        background-color: #1a2234 !important;
        border-color: #2d3748 !important;
      }
      .email-btn-primary {
        background-color: #3b82f6 !important;
        color: #ffffff !important;
      }
      a {
        color: #60a5fa !important;
      }
      .email-footer-text {
        color: #6b7280 !important;
      }
    }

    /* Mobile Responsive Rules */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
      }
      .email-inner-pad {
        padding: 24px 18px !important;
      }
      .email-btn {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body class="email-body-bg" style="margin: 0; padding: 0; background-color: #f3f4f6;">
  <!-- Preheader Snippet Text (invisible in body, visible in inbox list preview) -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${escapeHtml(safePreviewText)} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-body-bg" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <!-- Email Card Container (600px max width) -->
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; text-align: left; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header / Brand Banner -->
          <tr>
            <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid rgba(156, 163, 175, 0.2);">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left">
                    <span class="email-heading" style="font-size: 17px; font-weight: 700; letter-spacing: -0.01em; color: #111827; text-decoration: none;">
                      ${escapeHtml(brandName)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="email-inner-pad email-text" style="padding: 32px; font-size: 15px; line-height: 1.65; color: #374151;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; border-top: 1px solid rgba(156, 163, 175, 0.2); font-size: 12px; line-height: 1.5; color: #9ca3af;" class="email-footer-text email-muted">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="text-align: center;">
                    <p style="margin: 0 0 6px 0;">
                      You are receiving this mail from <strong>${escapeHtml(brandName)}</strong>.
                    </p>
                    <p style="margin: 0 0 6px 0;">
                      <a href="https://devunomieta.xyz" style="color: #60a5fa; text-decoration: underline; font-weight: 500;" target="_blank">
                        Problem First Software Engineer &amp; Product Manager
                      </a>
                    </p>
                    ${senderAddress ? `<p style="margin: 0 0 6px 0;">${escapeHtml(senderAddress)}</p>` : ""}
                    <p style="margin: 6px 0 0 0;">
                      <a href="${escapeHtml(unsubscribeUrl)}" style="color: #6b7280; text-decoration: underline;" target="_blank">
                        Unsubscribe or manage preferences
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
