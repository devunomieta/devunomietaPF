'use client'

import { useState } from 'react'
import { saveProject, deleteProject } from './actions'
import { Plus, Edit, Trash2, Globe, Star, GitFork, Loader2, X } from 'lucide-react'

export default function ProjectManager({ initialProjects }: { initialProjects: any[] }) {
  const [projects, setProjects] = useState(initialProjects)
  const [editingProject, setEditingProject] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await saveProject(formData, editingProject?.id)

    if (result.success) {
      setIsModalOpen(false)
      window.location.reload() // Simple way to refresh data
    } else {
      alert(result.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this project?')) return
    const result = await deleteProject(id)
    if (result.success) {
      window.location.reload()
    } else {
      alert(result.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">All Projects</h2>
        <button
          onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all text-sm"
        >
          <Plus size={16} /> Add Project
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {projects.map((project) => (
          <div key={project.id} className="bg-header/20 border border-border rounded-xl p-4 flex items-center justify-between hover:border-accent-blue/50 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{project.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                  <span className="flex items-center gap-1"><Star size={12} /> {project.stars}</span>
                  <span className="flex items-center gap-1"><GitFork size={12} /> {project.forks}</span>
                  <span className="px-2 py-0.5 rounded-full bg-border/50">{project.language}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setEditingProject(project); setIsModalOpen(true); }}
                className="p-2 text-muted hover:text-foreground hover:bg-white/5 rounded-lg transition-all"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => handleDelete(project.id)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-center py-12 text-muted bg-header/10 border border-dashed border-border rounded-xl">
            No projects found. Add your first one above!
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Project Name</label>
                  <input name="name" defaultValue={editingProject?.name} required className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Visibility</label>
                  <select name="visibility" defaultValue={editingProject?.visibility || 'Public'} className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none">
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase">Description</label>
                <textarea name="description" defaultValue={editingProject?.description} rows={2} className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Language</label>
                  <input name="language" defaultValue={editingProject?.language} placeholder="TypeScript" className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Language Color (Hex)</label>
                  <input name="language_color" defaultValue={editingProject?.language_color || '#3178c6'} className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Stars</label>
                  <input name="stars" type="number" defaultValue={editingProject?.stars || 0} className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Forks</label>
                  <input name="forks" type="number" defaultValue={editingProject?.forks || 0} className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Sort Order</label>
                  <input name="sort_order" type="number" defaultValue={editingProject?.sort_order || 0} className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase">Project URL</label>
                <input name="link" defaultValue={editingProject?.link} placeholder="https://github.com/..." className="w-full bg-header/30 border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue outline-none" />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-white/5 transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  {editingProject ? 'Update Project' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
