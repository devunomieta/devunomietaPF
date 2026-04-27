import { login } from './actions'
import { Terminal, Lock } from 'lucide-react'
import { GoogleSignInButton } from '@/components/ui/GoogleSignInButton'
import Link from 'next/link'

export default async function LoginPage({
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
          <h1 className="text-xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-muted text-sm mt-1">Authenticate to access /manage</p>
        </div>

        <GoogleSignInButton />

        <div className="relative flex py-6 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink-0 mx-4 text-muted text-xs uppercase tracking-widest font-semibold">Or with Email</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full bg-header/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors"
              placeholder="admin@devunomieta.xyz"
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="password">Password</label>
              <Link 
                href="/login/forgot-password"
                className="text-[10px] text-accent-blue hover:underline uppercase tracking-wider font-bold"
              >
                Forgot?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-header/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors"
              placeholder="••••••••"
            />
          </div>

          {resolvedParams?.error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2.5 rounded-md flex items-center gap-2 mt-2">
              <Lock size={14} />
              {resolvedParams.error}
            </div>
          )}

          <button
            formAction={login}
            className="mt-4 w-full bg-accent-green hover:bg-accent-green/90 text-white text-sm font-semibold py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  )
}
