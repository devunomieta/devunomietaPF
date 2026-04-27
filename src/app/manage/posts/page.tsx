import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { deletePost } from './actions'

export const revalidate = 0

export default async function ManagePostsPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, is_published, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Posts</h1>
          <p className="text-sm text-muted mt-1">Create, edit, and manage your blog discussions.</p>
        </div>
        <Link 
          href="/manage/posts/new"
          className="flex items-center gap-2 bg-accent-blue hover:bg-accent-blue/90 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> New Post
        </Link>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-header/30">
        <table className="w-full text-sm text-left">
          <thead className="bg-header/80 text-xs uppercase text-muted border-b border-border">
            <tr>
              <th className="px-6 py-4 font-semibold">Title</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(!posts || posts.length === 0) ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted">
                  No posts found. Start writing!
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-accent-blue/5 transition-colors group">
                  <td className="px-6 py-4 font-medium text-foreground">
                    {post.title}
                  </td>
                  <td className="px-6 py-4">
                    {post.is_published ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-accent-green/10 text-accent-green uppercase tracking-wider border border-accent-green/20">
                        <CheckCircle2 size={12} /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted/10 text-muted uppercase tracking-wider border border-border">
                        <XCircle size={12} /> Draft
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted font-mono text-xs">
                    {new Date(post.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                    <Link href={`/manage/posts/${post.id}`} className="text-muted hover:text-accent-blue transition-colors" title="Edit Post">
                      <Edit2 size={16} />
                    </Link>
                    <form action={async () => {
                      'use server'
                      await deletePost(post.id)
                    }}>
                      <button type="submit" className="text-muted hover:text-red-400 transition-colors" title="Delete Post">
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
