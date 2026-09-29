
export const welcomeEmailTemplate = (name: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Welcome to the Journey!</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7f9;
      color: #1a202c;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #0066ff;
      padding: 40px 20px;
      text-align: center;
      color: #ffffff;
    }
    .content {
      padding: 40px;
      line-height: 1.7;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #0066ff;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      font-size: 13px;
      color: #718096;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 10px;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a202c;
      }
      .container {
        background-color: #2d3748;
        color: #e2e8f0;
      }
      .content {
        color: #e2e8f0;
      }
      .footer {
        background-color: #1a202c;
        color: #a0aec0;
      }
      .button {
        background-color: #4299e1;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">Welcome to the Journey!</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>I'm <strong>Joseph Unomieta</strong>, and I'm thrilled to have you on board.</p>
      <p>As a Senior Software Engineer and CTO, I focus on building scalable web products and optimizing engineering workflows. My goal is to share insights that help you build better and grow faster.</p>
      <p><strong>How I can help you:</strong></p>
      <ul>
        <li><strong>Scalable Architecture:</strong> Designing systems that grow with your user base.</li>
        <li><strong>Product Growth:</strong> Strategic technical leadership to drive product success.</li>
        <li><strong>CTO Insights:</strong> Expert guidance for startups and engineering teams.</li>
      </ul>
      <p>I regularly write about these topics and more. You'll find a wealth of helpful articles on my blog that I believe will add value to your work.</p>
      <div style="text-align: center;">
        <a href="https://devunomieta.xyz/blog" class="button">Explore My Articles</a>
      </div>
      <p>Looking forward to staying connected!</p>
      <p>Best regards,<br><strong>Joseph Unomieta</strong></p>
    </div>
    <div class="footer">
      © 2026 DevUnomieta. All rights reserved.<br>
      You are receiving this because you subscribed to my newsletter.
    </div>
  </div>
</body>
</html>
`

export const weeklyEmailTemplate = (name: string, latestPost?: { title: string, snippet: string, slug: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Weekly Insights</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7f9;
      color: #1a202c;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #1a202c;
      padding: 30px 20px;
      text-align: center;
      color: #ffffff;
    }
    .content {
      padding: 40px;
      line-height: 1.7;
    }
    .post-card {
      background-color: #f8fafc;
      padding: 20px;
      border-radius: 10px;
      border-left: 4px solid #0066ff;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #1a202c;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      font-size: 13px;
      color: #718096;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0f172a;
      }
      .container {
        background-color: #1e293b;
        color: #e2e8f0;
      }
      .content {
        color: #e2e8f0;
      }
      .post-card {
        background-color: #334155;
        border-left-color: #3b82f6;
      }
      .footer {
        background-color: #0f172a;
        color: #94a3b8;
      }
      .button {
        background-color: #3b82f6;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0; font-size: 22px;">Weekly Tech Insights</h2>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>I hope you've had a productive week!</p>
      <p>As I continue to build and refine architectural patterns, I'm reminded of why we do what we do: to create systems that stand the test of time and scale effortlessly.</p>
      
      <p><strong>Why Hire Me?</strong></p>
      <p>I help businesses bridge the gap between complex technical requirements and business growth. If you need a partner to audit your current architecture or build your next scalable platform, I'm just an email away.</p>

      ${latestPost ? `
      <div class="post-card">
        <h3 style="margin-top: 0; font-size: 18px; color: #0066ff;">${latestPost.title}</h3>
        <p style="font-size: 14px; margin-bottom: 10px;">${latestPost.snippet}</p>
        <a href="https://devunomieta.xyz/blog/${latestPost.slug}" style="color: #0066ff; font-weight: bold;">Read Full Article →</a>
      </div>
      ` : ''}

      <div style="text-align: center;">
        <a href="https://devunomieta.xyz/contact" class="button">Hire Me for Your Project</a>
      </div>
      
      <p>Stay curious and keep building!</p>
      <p>Best,<br><strong>Joseph</strong></p>
    </div>
    <div class="footer">
      © 2026 DevUnomieta. All rights reserved.<br>
      <a href="[unsubscribe_link]" style="color: #718096; text-decoration: underline;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>
`;

export const assistantOnboardingAgreementEmail = ({
  name,
  email,
  tempPassword,
  roleTitle,
  loginUrl,
}: {
  name: string;
  email: string;
  tempPassword?: string;
  roleTitle: string;
  loginUrl: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the Team - Assistant Onboarding & Agreement</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b1120;
      color: #e2e8f0;
    }
    .wrapper {
      max-width: 620px;
      margin: 24px auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #0284c7 0%, #1e40af 100%);
      padding: 32px 28px;
      text-align: left;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      color: #ffffff;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0;
      color: #bae6fd;
      font-size: 13px;
    }
    .content {
      padding: 30px 28px;
      line-height: 1.6;
      font-size: 14px;
      color: #cbd5e1;
    }
    .callout {
      background-color: #1e293b;
      border-left: 4px solid #38bdf8;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }
    .callout-title {
      font-weight: 700;
      color: #f8fafc;
      font-size: 14px;
      margin-bottom: 6px;
    }
    .creds-box {
      background-color: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    .creds-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-family: monospace;
      font-size: 13px;
    }
    .creds-label {
      color: #94a3b8;
    }
    .creds-val {
      color: #38bdf8;
      font-weight: 600;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 13px 26px;
      border-radius: 8px;
      margin: 15px 0 25px;
      text-align: center;
    }
    .footer {
      background-color: #0b1120;
      border-top: 1px solid #1f2937;
      padding: 20px 28px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    ul {
      padding-left: 20px;
      margin: 10px 0;
    }
    li {
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Welcome to the Team</h1>
      <p>Appointment: ${roleTitle} to Joseph Unomieta</p>
    </div>
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>You have been officially invited and provisioned to join my team as a <strong>${roleTitle}</strong>. In this capacity, you will work closely with me (Joseph Unomieta) co-managing business, scheduling, social media accounts, CRM workflows, and client relationships.</p>

      <div class="callout">
        <div class="callout-title">📋 Summary of Terms & Key Provisions</div>
        <ul>
          <li><strong>Role Responsibilities:</strong> Co-managing administrative schedules, CRM leads/clients, and managing/posting to official social media channels (WhatsApp Business, LinkedIn, X, Instagram).</li>
          <li><strong>Mentorship & Training:</strong> I will actively guide and train you in systems, technical methodologies, and operational areas where you need development.</li>
          <li><strong>15% Net Profit Share:</strong> You will earn 15% of the declared <em>net profit</em> for every paying client you actively co-handle (calculated after direct service delivery costs are deducted, upon final invoice settlement).</li>
          <li><strong>Perpetual NDA:</strong> All information accessed (verbal, written, digital, or observed) must be kept confidential <strong>for life</strong>, with disclosures strictly prohibited unless compelled by a court of law with prior written notice.</li>
        </ul>
      </div>

      <div class="creds-box">
        <div style="font-weight: 600; color: #f8fafc; margin-bottom: 8px; font-size: 13px;">Your Login Credentials</div>
        <div class="creds-row"><span class="creds-label">Portal URL:</span> <span class="creds-val">${loginUrl}</span></div>
        <div class="creds-row"><span class="creds-label">Email:</span> <span class="creds-val">${email}</span></div>
        ${tempPassword ? `<div class="creds-row"><span class="creds-label">Temporary Password:</span> <span class="creds-val">${tempPassword}</span></div>` : ""}
      </div>

      <p style="color: #f59e0b; font-size: 13px; font-weight: 600;">
        ⚠️ Mandatory Step on First Login:<br>
        To access the CRM portal, you will be required to review the complete Personal Assistant Agreement & NDA on your first screen, and provide binding electronic consent by entering your legal First Name, Last Name, and Date of Birth.
      </p>

      <div style="text-align: center;">
        <a href="${loginUrl}" class="btn">Log In & Review Agreement →</a>
      </div>

      <p>I look forward to our productive collaboration.</p>
      <p>Best regards,<br><strong>Joseph Unomieta</strong><br><span style="font-size: 12px; color: #94a3b8;">Principal & Founder</span></p>
    </div>
    <div class="footer">
      This is an automated administrative dispatch from the DevUnomieta CRM System.<br>
      © 2026 Joseph Unomieta. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
