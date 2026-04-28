'use client'

import { useState } from 'react'
import { saveCampaign, sendCampaignAction, deleteSubscriber } from './actions'
import { Users, Send, Plus, Trash2, Mail, Loader2, X, CheckCircle } from 'lucide-react'

export default function NewsletterManager({ subscribers, campaigns }: { subscribers: any[], campaigns: any[] }) {
  const [activeTab, setActiveTab] = useState<'subscribers' | 'campaigns'>('subscribers')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [showToast, setShowToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const filteredSubscribers = subscribers.filter(sub => 
    sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredSubscribers.length / pageSize)
  const paginatedSubscribers = filteredSubscribers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="bg-header/20 border border-border rounded-lg px-4 py-1.5 text-xs text-foreground outline-none focus:border-accent-blue transition-all w-full max-w-sm"
            />
            <div className="text-[10px] text-muted font-mono">
              Showing {paginatedSubscribers.length} of {filteredSubscribers.length}
            </div>
          </div>

          <div className="bg-header/20 border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-header/40 text-muted uppercase text-[9px] tracking-widest font-bold border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Joined</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-2 text-foreground font-medium">
                      <div className="flex flex-col">
                        <span>{sub.name || 'Anonymous'}</span>
                        {sub.display_name && sub.display_name !== sub.name && (
                          <span className="text-[9px] text-muted opacity-60">@{sub.display_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted">{sub.email}</td>
                    <td className="px-4 py-2">
                      <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[9px] font-bold">ACTIVE</span>
                    </td>
                    <td className="px-4 py-2 text-muted">
                      {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button 
                        onClick={() => { if(confirm('Delete subscriber?')) deleteSubscriber(sub.id).then(() => window.location.reload()) }} 
                        className="text-muted hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paginatedSubscribers.length === 0 && (
              <div className="p-8 text-center text-muted text-xs italic">
                {searchTerm ? 'No matches found.' : 'No subscribers yet.'}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-2 py-1 text-[10px] border border-border rounded hover:bg-header disabled:opacity-30"
              >
                Prev
              </button>
              <span className="text-[10px] text-muted px-2">Page {currentPage} of {totalPages}</span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-2 py-1 text-[10px] border border-border rounded hover:bg-header disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
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
                      onClick={async () => { 
                        if(confirm('Send to all subscribers?')) { 
                          setLoading(true); 
                          const res = await sendCampaignAction(camp.id); 
                          if (res.success) {
                            setShowToast({ show: true, message: res.details || 'Campaign sent successfully!' });
                            setTimeout(() => { setShowToast({ show: false, message: '' }); window.location.reload(); }, 3000);
                          } else {
                            alert(res.error);
                            setLoading(false);
                          }
                        } 
                      }}
                      className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-all flex items-center gap-2"
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send Now</>}
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

      {/* Success Toast */}
      {showToast.show && (
        <div className="fixed bottom-8 right-8 z-[200] animate-in slide-in-from-right duration-500">
          <div className="bg-background border border-accent-green/30 rounded-xl p-4 shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <div className="bg-accent-green/20 p-2 rounded-lg text-accent-green">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Mission Accomplished</p>
              <p className="text-xs text-muted">{showToast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
