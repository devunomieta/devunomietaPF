import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Joseph Unomieta',
  description: 'Terms and conditions for using this website.',
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold text-foreground mb-8">Terms of Service</h1>
      
      <div className="prose prose-invert prose-blue max-w-none space-y-6 text-muted leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Agreement to Terms</h2>
          <p>
            By accessing my website, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the materials (information or software) on this website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Disclaimer</h2>
          <p>
            The materials on this website are provided on an 'as is' basis. I make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Limitations</h2>
          <p>
            In no event shall I or my suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Accuracy of Materials</h2>
          <p>
            The materials appearing on this website could include technical, typographical, or photographic errors. I do not warrant that any of the materials on its website are accurate, complete or current. I may make changes to the materials contained on its website at any time without notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Links</h2>
          <p>
            I have not reviewed all of the sites linked to its website and am not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by me of the site. Use of any such linked website is at the user's own risk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in accordance with the laws of your jurisdiction and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
          </p>
        </section>

        <p className="text-sm mt-12 pt-8 border-t border-border">
          Last updated: April 27, 2026
        </p>
      </div>
    </div>
  )
}
