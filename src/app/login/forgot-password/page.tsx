import { requestPasswordReset } from '../actions'
import { Terminal, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string; success: string }>
}) {
  const resolvedParams = await searchParams;

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm p-6 bg-background border border-border rounded-xl shadow-2xl relative glow">
        <div className="absolute -top-3 -left-3 bg-accent-blue p-2 rounded-lg">
          <Terminal size={20} className="text-white" />
        </div>
        
        <div className="text-center mb-6 mt-2">
          <h1 className="text-xl font-bold text-foreground">Forgot Password</h1>
          <p className="text-muted text-sm mt-1">We'll send a reset link to your email</p>
        </div>

        {resolvedParams?.success ? (
          <div className="space-y-6 text-center">
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-4 rounded-lg flex items-center gap-3">
              <CheckCircle size={20} />
              {resolvedParams.success}
            </div>
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-accent-blue hover:underline"
            >
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        ) : (
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="email">Email</label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full bg-header/50 border border-border rounded-md pl-10 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors"
                  placeholder="admin@devunomieta.xyz"
                />
                <Mail size={16} className="absolute left-3 top-2.5 text-muted" />
              </div>
            </div>

            {resolvedParams?.error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2.5 rounded-md flex items-center gap-2">
                <AlertCircle size={14} />
                {resolvedParams.error}
              </div>
            )}

            <button
              formAction={requestPasswordReset}
              className="mt-4 w-full bg-accent-blue hover:bg-accent-blue/90 text-white text-sm font-semibold py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              Send Reset Link
            </button>

            <Link 
              href="/login"
              className="text-center text-xs text-muted hover:text-foreground transition-colors mt-2"
            >
              Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
