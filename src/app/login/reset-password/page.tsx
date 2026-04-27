import { resetPassword } from '../actions'
import { Terminal, Lock, AlertCircle } from 'lucide-react'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const resolvedParams = await searchParams;

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm p-6 bg-background border border-border rounded-xl shadow-2xl relative glow">
        <div className="absolute -top-3 -left-3 bg-accent-blue p-2 rounded-lg">
          <Terminal size={20} className="text-white" />
        </div>
        
        <div className="text-center mb-6 mt-2">
          <h1 className="text-xl font-bold text-foreground">Set New Password</h1>
          <p className="text-muted text-sm mt-1">Enter your new secure password</p>
        </div>

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="password">New Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full bg-header/50 border border-border rounded-md pl-10 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors"
                placeholder="••••••••"
              />
              <Lock size={16} className="absolute left-3 top-2.5 text-muted" />
            </div>
          </div>

          {resolvedParams?.error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2.5 rounded-md flex items-center gap-2">
              <AlertCircle size={14} />
              {resolvedParams.error}
            </div>
          )}

          <button
            formAction={resetPassword}
            className="mt-4 w-full bg-accent-green hover:bg-accent-green/90 text-white text-sm font-semibold py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}
