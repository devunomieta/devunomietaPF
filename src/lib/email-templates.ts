
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
      <h1>Welcome to Our Team!</h1>
      <p>Your Role: ${roleTitle} · Working with Joseph Unomieta</p>
    </div>
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>I am thrilled to officially welcome you to the team as a <strong>${roleTitle}</strong>! In this role, you will be working closely with me to coordinate key operational workflows, nurture our client relationships, manage our messaging channels, and help drive our projects forward.</p>

      <div class="callout">
        <div class="callout-title">🤝 Our Mutual Commitments & Highlights</div>
        <ul>
          <li><strong>Meaningful Day-to-Day Impact:</strong> Co-managing administrative schedules, nurturing CRM leads and client accounts, and curating posts across our official channels (WhatsApp Business, LinkedIn, X, Instagram).</li>
          <li><strong>Dedicated Mentorship & Growth:</strong> I am personally committed to guiding and mentoring you, sharing technical insights, and helping you develop high-leverage skills every step of the way.</li>
          <li><strong>Shared Success (15% Net Profit Share):</strong> You earn 15% of declared net profit on every paying client project you actively co-handle (calculated after direct delivery expenses are deducted, once the client's invoice is settled).</li>
          <li><strong>Mutual Trust & Perpetual Confidentiality:</strong> Because we will work with proprietary ideas, client data, and systems, safeguarding this information with lifelong discretion is foundational to our mutual trust.</li>
        </ul>
      </div>

      <div class="creds-box">
        <div style="font-weight: 600; color: #f8fafc; margin-bottom: 8px; font-size: 13px;">Your Portal Access Credentials</div>
        <div class="creds-row"><span class="creds-label">Portal URL:</span> <span class="creds-val">${loginUrl}</span></div>
        <div class="creds-row"><span class="creds-label">Account Email:</span> <span class="creds-val">${email}</span></div>
        ${tempPassword ? `<div class="creds-row"><span class="creds-label">Temporary Password:</span> <span class="creds-val">${tempPassword}</span></div>` : ""}
      </div>

      <p style="color: #38bdf8; font-size: 13px; font-weight: 600;">
        ✨ Getting Started on Your First Sign-In:<br>
        When you log in for the first time, you'll see a quick onboarding screen where you can review our full Assistant Collaboration Agreement & NDA, verify your basic details (legal name and date of birth), and seal your digital agreement. Once signed, your full CRM workspace will unlock immediately.
      </p>

      <div style="text-align: center;">
        <a href="${loginUrl}" class="btn">Log In & Complete Setup →</a>
      </div>

      <p>I'm genuinely excited to build, learn, and succeed together!</p>
      <p>Warmest regards,<br><strong>Joseph Unomieta</strong><br><span style="font-size: 12px; color: #94a3b8;">Principal & Founder</span></p>
    </div>
    <div class="footer">
      This is an automated administrative dispatch from the DevUnomieta CRM System.<br>
      © 2026 Joseph Unomieta. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
