import { submitInquiry } from './actions'
import { Mail, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react'

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
            Whether you have a question, a project proposal, or just want to say hi, feel free to reach out. I'll get back to you as soon as I can.
          </p>
        </div>

        {searchParams.success ? (
          <div className="bg-accent-green/10 border border-accent-green/20 rounded-lg p-6 flex flex-col items-center justify-center text-center gap-3 relative z-10">
            <CheckCircle2 size={48} className="text-accent-green" />
            <div>
              <h3 className="font-semibold text-foreground text-lg">Message Sent Successfully!</h3>
              <p className="text-muted text-sm mt-1">Thank you for reaching out. I will review your inquiry shortly.</p>
            </div>
            <a href="/" className="mt-4 bg-header border border-border px-4 py-2 rounded-md text-sm font-semibold hover:border-accent-blue transition-colors">
              Return Home
            </a>
          </div>
        ) : (
          <form className="flex flex-col gap-5 relative z-10" action={submitInquiry}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-foreground uppercase tracking-wider">Your Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  className="w-full bg-header/50 border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-foreground uppercase tracking-wider">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="john@example.com"
                  className="w-full bg-header/50 border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="text-xs font-semibold text-foreground uppercase tracking-wider">Message</label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                placeholder="How can I help you?"
                className="w-full bg-header/50 border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors resize-y"
              ></textarea>
            </div>

            {searchParams.error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-md flex items-center gap-2">
                <AlertCircle size={14} />
                {searchParams.error}
              </div>
            )}

            <button
              type="submit"
              className="mt-2 bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold py-2.5 px-6 rounded-md transition-colors flex items-center justify-center gap-2 w-fit"
            >
              <Send size={16} />
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
