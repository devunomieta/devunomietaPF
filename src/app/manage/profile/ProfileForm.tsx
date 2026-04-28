'use client'

import { useState, useRef } from 'react'
import { updateProfile } from './actions'
import { uploadAsset } from '../settings/actions'
import { Save, Loader2, Upload, User } from 'lucide-react'

export default function ProfileForm({ initialData }: { initialData: any }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>(initialData?.avatar_url || '')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialData?.tech_stack || [])

  const AVAILABLE_SKILLS = [
    "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Svelte", "Angular",
    "Node.js", "Express", "NestJS", "Python", "Django", "FastAPI", "Go", "Rust",
    "Java", "Spring Boot", "C#", ".NET", "Ruby on Rails", "PHP", "Laravel",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Supabase", "Firebase",
    "AWS", "GCP", "Azure", "Vercel", "Docker", "Kubernetes", "CI/CD", "GitHub Actions",
    "GraphQL", "REST APIs", "Tailwind CSS", "Sass", "Figma", "UI/UX",
    "Web3", "Solana", "EVM", "Smart Contracts", "System Architecture", "Team Leadership"
  ].sort()

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadAsset(fd, 'avatar')
    if (res?.url) setAvatarUrl(res.url)
    setAvatarLoading(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    formData.set('avatar_url', avatarUrl)
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

      {/* Avatar Upload */}
      <div className="flex items-center gap-6 pb-6 border-b border-border">
        <div className="relative w-24 h-24 rounded-full border-2 border-border overflow-hidden bg-header flex items-center justify-center shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User size={36} className="text-muted" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">Profile Photo</p>
          <p className="text-xs text-muted mb-3">JPG or PNG. Recommended: 400×400px.</p>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarLoading}
            className="flex items-center gap-2 px-4 py-2 bg-header border border-border rounded-lg text-sm text-foreground hover:border-accent-blue transition-all disabled:opacity-50"
          >
            {avatarLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {avatarLoading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      </div>

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

      <div className="space-y-4 pt-4 border-t border-border">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">Core Tech Stack</label>
          <p className="text-xs text-muted mb-3">Select the technologies you actively work with.</p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-header/20 border border-border rounded-lg custom-scrollbar">
            {AVAILABLE_SKILLS.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    isSelected 
                      ? 'bg-accent-blue text-white border-accent-blue shadow-sm shadow-accent-blue/20' 
                      : 'bg-header border-border text-muted hover:border-accent-blue/50 hover:text-foreground'
                  }`}
                >
                  {skill}
                </button>
              )
            })}
          </div>
          {/* Hidden input to submit the array as a comma-separated string */}
          <input type="hidden" name="tech_stack" value={selectedSkills.join(',')} />
        </div>
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
