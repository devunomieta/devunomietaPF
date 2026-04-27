import { Suspense } from 'react'
import ContactForm from './ContactForm'
import { Mail, MessageSquare, CheckCircle2 } from 'lucide-react'

export default function ContactPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Mail size={24} className="text-muted" />
        <h1 className="text-2xl font-semibold text-foreground">Contact Me</h1>
      </div>

      <div className="bg-background border border-border rounded-xl p-6 glow relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <MessageSquare size={200} />
        </div>

        <div className="mb-6 relative z-10">
          <h2 className="text-xl font-semibold text-foreground mb-2">Drop a message</h2>
          <p className="text-muted text-sm leading-relaxed">
            Whether you have a question, a project proposal, or just want to say hi, feel free to reach out. I&apos;ll get back to you as soon as I can.
          </p>
        </div>

        {searchParams.success ? (
          <div className="bg-accent-green/10 border border-accent-green/20 rounded-lg p-6 flex flex-col items-center justify-center text-center gap-3 relative z-10">
            <CheckCircle2 size={48} className="text-accent-green" />
            <div>
              <h3 className="font-semibold text-foreground text-lg">Message Sent Successfully!</h3>
              <p className="text-muted text-sm mt-1">Thank you for reaching out. I will review your inquiry shortly.</p>
              
              <div className="mt-6 p-4 bg-accent-blue/10 rounded-lg border border-accent-blue/20 max-w-sm mx-auto">
                <p className="text-xs text-foreground font-medium mb-3 italic">Want to skip the wait?</p>
                <a 
                  href="https://cal.com/devunomieta" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-accent-blue text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-accent-blue/80 transition-all"
                >
                  Schedule a Call on Cal.com
                </a>
              </div>
            </div>
            <a href="/" className="mt-8 bg-header border border-border px-4 py-2 rounded-md text-sm font-semibold hover:border-accent-blue transition-colors">
              Return Home
            </a>
          </div>
        ) : (
          <Suspense fallback={<div className="h-[400px] flex items-center justify-center text-muted text-sm italic">Loading form...</div>}>
            <ContactForm error={searchParams.error} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
