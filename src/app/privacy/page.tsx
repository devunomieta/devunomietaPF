import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Joseph Unomieta',
  description: 'How we handle your data and protect your privacy.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>
      
      <div className="prose prose-invert prose-blue max-w-none space-y-6 text-muted leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
          <p>
            Welcome to my personal portfolio and blog. I respect your privacy and am committed to protecting your personal data. This privacy policy will inform you about how I look after your personal data when you visit my website and tell you about your privacy rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. The Data I Collect</h2>
          <p>
            I may collect, use, store and transfer different kinds of personal data about you which I have grouped together as follows:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Identity Data:</strong> Includes name if provided via contact forms or newsletter signups.</li>
            <li><strong>Contact Data:</strong> Includes email address.</li>
            <li><strong>Technical Data:</strong> Includes internet protocol (IP) address, browser type and version, time zone setting and location, and other technology on the devices you use to access this website.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. How I Use Your Data</h2>
          <p>
            I will only use your personal data when the law allows me to. Most commonly, I will use your personal data in the following circumstances:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To register you as a new newsletter subscriber.</li>
            <li>To respond to inquiries sent via contact forms.</li>
            <li>To improve my website, products/services, marketing, and customer relationships.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Newsletter and Marketing</h2>
          <p>
            I use Brevo to manage my newsletter. By subscribing, you acknowledge that your information will be transferred to Brevo for processing in accordance with their Privacy Policy. You can unsubscribe at any time by clicking the link in the footer of my emails.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Security</h2>
          <p>
            I have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Legal Rights</h2>
          <p>
            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to receive a copy of the personal data I hold about you and the right to make a complaint at any time to the relevant data protection authority.
          </p>
        </section>

        <p className="text-sm mt-12 pt-8 border-t border-border">
          Last updated: April 27, 2026
        </p>
      </div>
    </div>
  )
}
