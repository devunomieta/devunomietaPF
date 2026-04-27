'use client'

import { useState } from 'react'
import { saveCampaign, sendCampaignAction, deleteSubscriber } from './actions'
import { Users, Send, Plus, Trash2, Mail, Loader2, X, CheckCircle } from 'lucide-react'

export default function NewsletterManager({ subscribers, campaigns }: { subscribers: any[], campaigns: any[] }) {
  const [activeTab, setActiveTab] = useState<'subscribers' | 'campaigns'>('subscribers')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCampaignSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await saveCampaign(formData, editingCampaign?.id)
    if (result.success) {
      setIsModalOpen(false)
      window.location.reload()
    } else alert(result.error)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button 
          onClick={() => setActiveTab('subscribers')}
          className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'subscribers' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-muted hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} /> Subscribers ({subscribers.length})
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'campaigns' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-muted hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2">
            <Send size={16} /> Campaigns ({campaigns.length})
          </div>
        </button>
      </div>

      {activeTab === 'subscribers' ? (
        <div className="bg-header/20 border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-header/40 text-muted uppercase text-[10px] tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-foreground font-medium">{sub.name || 'Anonymous'}</td>
                  <td className="px-6 py-4 text-muted">{sub.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold">ACTIVE</span>
                  </td>
                  <td className="px-6 py-4 text-muted">{new Date(sub.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteSubscriber(sub.id).then(() => window.location.reload())} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {subscribers.length === 0 && <div className="p-12 text-center text-muted">No subscribers yet.</div>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingCampaign(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-semibold hover:bg-accent-blue/80 transition-all">
              <Plus size={16} /> Create Campaign
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {campaigns.map((camp) => (
              <div key={camp.id} className="bg-header/20 border border-border rounded-xl p-5 flex items-center justify-between hover:border-accent-blue/50 transition-all group">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {camp.title}
                    {camp.status === 'sent' && <CheckCircle size={14} className="text-green-400" />}
                  </h3>
                  <p className="text-xs text-muted mt-1">{camp.subject}</p>
                  <p className="text-[10px] text-muted/50 mt-2 uppercase tracking-wider">
                    {camp.status === 'sent' ? `Sent on ${new Date(camp.sent_at).toLocaleString()}` : 'Draft'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {camp.status === 'draft' && (
                    <button 
                      onClick={async () => { if(confirm('Send to all subscribers?')) { setLoading(true); await sendCampaignAction(camp.id); window.location.reload(); } }}
                      className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-all flex items-center gap-2"
                    >
                      <Send size={14} /> Send Now
                    </button>
                  )}
                  <button onClick={() => { setEditingCampaign(camp); setIsModalOpen(true); }} className="p-2 text-muted hover:text-foreground"><Mail size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleCampaignSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase">Internal Title (e.g. April Update)</label>
                <input name="title" defaultValue={editingCampaign?.title} required className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase">Subject Line (Visible to Recipients)</label>
                <input name="subject" defaultValue={editingCampaign?.subject} required className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase">Email Content (HTML/Markdown)</label>
                <textarea name="content" defaultValue={editingCampaign?.content} rows={10} required className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground outline-none resize-none font-mono text-sm" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={loading} className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  {loading && <Loader2 className="animate-spin" size={18} />}
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
