'use client'

import { useState } from 'react'
import { updateProfile } from './actions'
import { Save, Loader2 } from 'lucide-react'

export default function ProfileForm({ initialData }: { initialData: any }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const result = await updateProfile(formData)

    if (result?.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {message && (
        <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">Full Name</label>
          <input
            name="name"
            defaultValue={initialData?.name}
            className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none transition-all"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">Handle</label>
          <input
            name="handle"
            defaultValue={initialData?.handle}
            className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none transition-all"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">Titles (comma separated)</label>
        <input
          name="titles"
          defaultValue={initialData?.titles?.join(', ')}
          className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none transition-all"
          placeholder="Software Engineer, CTO, etc."
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">Short Bio</label>
        <textarea
          name="bio"
          defaultValue={initialData?.bio}
          rows={3}
          className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none transition-all resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">About Me (Markdown)</label>
        <textarea
          name="about_me"
          defaultValue={initialData?.about_me}
          rows={6}
          className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none transition-all resize-none font-mono text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">Location</label>
          <input
            name="location"
            defaultValue={initialData?.location}
            className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={initialData?.email}
            className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none transition-all"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">Website</label>
        <input
          name="website"
          defaultValue={initialData?.website}
          className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  )
}
