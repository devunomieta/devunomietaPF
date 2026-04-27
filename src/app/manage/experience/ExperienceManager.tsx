'use client'

import { useState } from 'react'
import { saveExperience, deleteExperience } from './actions'
import { Plus, Edit, Trash2, Briefcase, Loader2, X, Calendar } from 'lucide-react'

export default function ExperienceManager({ initialExperience }: { initialExperience: any[] }) {
  const [items, setItems] = useState(initialExperience)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await saveExperience(formData, editingItem?.id)

    if (result.success) {
      setIsModalOpen(false)
      window.location.reload()
    } else {
      alert(result.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure?')) return
    const result = await deleteExperience(id)
    if (result.success) window.location.reload()
    else alert(result.error)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">Work History</h2>
        <button
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all text-sm"
        >
          <Plus size={16} /> Add Experience
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-header/20 border border-border rounded-xl p-4 flex items-center justify-between hover:border-accent-blue/50 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                <Briefcase size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{item.role}</h3>
                <p className="text-sm text-muted">{item.company}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                  <Calendar size={12} /> {item.date_range}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                className="p-2 text-muted hover:text-foreground hover:bg-white/5 rounded-lg transition-all"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-12 text-muted bg-header/10 border border-dashed border-border rounded-xl">
            No experience records found.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-xl shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">
                {editingItem ? 'Edit Experience' : 'Add Experience'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Role / Title</label>
                  <input name="role" defaultValue={editingItem?.role} required className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Company</label>
                  <input name="company" defaultValue={editingItem?.company} required className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Date Range</label>
                  <input name="date_range" defaultValue={editingItem?.date_range} placeholder="Jan 2020 - Present" required className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Sort Order</label>
                  <input name="sort_order" type="number" defaultValue={editingItem?.sort_order || 0} className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase">Description (Markdown)</label>
                <textarea name="description" defaultValue={editingItem?.description} rows={5} className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none resize-none" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-white/5 transition-all text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={loading} className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all text-sm font-semibold disabled:opacity-50">
                  {loading && <Loader2 className="animate-spin" size={18} />}
                  {editingItem ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
