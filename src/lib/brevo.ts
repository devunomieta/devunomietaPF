export async function sendEmail({ to, subject, htmlContent }: { to: { email: string, name?: string }[], subject: string, htmlContent: string }) {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || 'Portfolio Admin'

  if (!apiKey || !senderEmail) {
    console.error('Brevo API key or sender email missing')
    return { error: 'Email service not configured' }
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: to,
        subject: subject,
        htmlContent: htmlContent,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Brevo error:', data)
      return { error: data.message || 'Failed to send email' }
    }

    return { success: true, messageId: data.messageId }
  } catch (error) {
    console.error('Email send error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
