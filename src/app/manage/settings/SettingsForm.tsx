'use client'

import { useState, useRef } from 'react'
import { updateSettings, uploadAsset, changePassword } from './actions'
import { Save, Loader2, Upload, Image, Globe, Lock, Mail, Info } from 'lucide-react'

type Settings = Record<string, string>

function Field({ label, name, defaultValue, placeholder, type = 'text' }: {
  label: string; name: string; defaultValue?: string; placeholder?: string; type?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none transition-all text-sm"
      />
    </div>
  )
}

function SectionTitle({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-6 pb-4 border-b border-border">
      <div className="p-2 bg-accent-blue/10 rounded-lg">
        <Icon size={18} className="text-accent-blue" />
      </div>
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function StatusMsg({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null
  return (
    <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
      {msg.text}
    </div>
  )
}

function AssetUploader({ label, currentUrl, type, onUploaded }: {
  label: string; currentUrl?: string; type: 'logo' | 'favicon'; onUploaded?: (url: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [previewUrl, setPreviewUrl] = useState(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setMsg(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadAsset(fd, type)
    if (res.error) {
      setMsg({ type: 'error', text: res.error })
    } else {
      setPreviewUrl(res.url)
      setMsg({ type: 'success', text: `${label} uploaded!` })
      onUploaded?.(res.url!)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl border border-border bg-header/30 flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="w-full h-full object-contain p-1" />
          ) : (
            <Image size={24} className="text-muted" />
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-header border border-border rounded-lg text-sm text-foreground hover:border-accent-blue transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {loading ? 'Uploading...' : `Upload ${label}`}
          </button>
          <p className="text-xs text-muted mt-1">SVG, PNG or ICO. Max 2MB.</p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <StatusMsg msg={msg} />
    </div>
  )
}

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [siteLoading, setSiteLoading] = useState(false)
  const [siteMsg, setSiteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSiteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSiteLoading(true)
    setSiteMsg(null)
    const fd = new FormData(e.currentTarget)
    const res = await updateSettings(fd)
    setSiteMsg(res.success ? { type: 'success', text: 'Settings saved!' } : { type: 'error', text: 'Failed to save.' })
    setSiteLoading(false)
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPwLoading(true)
    setPwMsg(null)
    const fd = new FormData(e.currentTarget)
    const res = await changePassword(fd)
    if (res?.error) {
      setPwMsg({ type: 'error', text: res.error })
    } else {
      setPwMsg({ type: 'success', text: 'Password updated successfully!' })
      ;(e.target as HTMLFormElement).reset()
    }
    setPwLoading(false)
  }

  return (
    <div className="space-y-8">

      {/* Site Identity */}
      <div className="bg-header/20 border border-border rounded-xl p-6">
        <SectionTitle icon={Globe} title="Site Identity" description="Configure your site name, tagline, and description." />
        <form onSubmit={handleSiteSubmit} className="space-y-4 max-w-2xl">
          <Field label="Site Name" name="site_name" defaultValue={settings['site_name']} placeholder="Joseph Unomieta" />
          <Field label="Tagline" name="site_tagline" defaultValue={settings['site_tagline']} placeholder="Senior Software Engineer & Architect" />
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Default SEO Description</label>
            <textarea
              name="site_description"
              defaultValue={settings['site_description']}
              rows={3}
              className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none transition-all text-sm resize-none"
            />
          </div>
          <Field label="OG / Social Share Image URL" name="og_image_url" defaultValue={settings['og_image_url']} placeholder="https://..." />
          <StatusMsg msg={siteMsg} />
          <button type="submit" disabled={siteLoading} className="flex items-center gap-2 px-5 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all disabled:opacity-50 text-sm font-semibold">
            {siteLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {siteLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Assets */}
      <div className="bg-header/20 border border-border rounded-xl p-6">
        <SectionTitle icon={Image} title="Logo & Favicon" description="Upload your site logo and browser favicon." />
        <div className="space-y-6 max-w-2xl">
          <AssetUploader label="Site Logo" currentUrl={settings['logo_url']} type="logo" />
          <AssetUploader label="Favicon" currentUrl={settings['favicon_url']} type="favicon" />
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-header/20 border border-border rounded-xl p-6">
        <SectionTitle icon={Lock} title="Change Password" description="Update your admin portal password." />
        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">New Password</label>
            <input name="new_password" type="password" required minLength={8} className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none text-sm" placeholder="Min. 8 characters" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Confirm Password</label>
            <input name="confirm_password" type="password" required minLength={8} className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none text-sm" placeholder="Repeat password" />
          </div>
          <StatusMsg msg={pwMsg} />
          <button type="submit" disabled={pwLoading} className="flex items-center gap-2 px-5 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all disabled:opacity-50 text-sm font-semibold">
            {pwLoading ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />}
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Email Templates Info */}
      <div className="bg-header/20 border border-border rounded-xl p-6">
        <SectionTitle icon={Mail} title="Email Templates" description="Auth emails (password reset, magic links) are sent via Supabase." />
        <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-4 flex gap-3">
          <Info size={16} className="text-accent-blue mt-0.5 shrink-0" />
          <div className="text-sm text-muted space-y-2">
            <p>To customise email templates, go to your <strong className="text-foreground">Supabase Dashboard → Authentication → Email Templates</strong>.</p>
            <p>To send from your own domain (e.g. <code className="text-accent-blue text-xs bg-header px-1 rounded">contacts@devunomieta.xyz</code>), configure custom SMTP:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li><strong className="text-foreground">Supabase Dashboard → Project Settings → Authentication → SMTP</strong></li>
              <li>Enable custom SMTP</li>
              <li>Host: <code className="text-accent-blue bg-header px-1 rounded">smtp-relay.brevo.com</code> | Port: <code className="text-accent-blue bg-header px-1 rounded">587</code></li>
              <li>Username: your Brevo login email</li>
              <li>Password: Brevo SMTP key (Brevo → SMTP & API → SMTP tab → Generate key)</li>
            </ol>
          </div>
        </div>
      </div>

    </div>
  )
}
