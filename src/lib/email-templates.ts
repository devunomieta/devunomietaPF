
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
`
