import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { deletePost } from './actions'
import { redirect } from 'next/navigation'

export const revalidate = 0

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ManagePostsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const searchQuery = (params.q as string) || ''
  const pageSize = 10
  
  const supabase = await createClient()

  let query = supabase
    .from('posts')
    .select('id, title, is_published, created_at', { count: 'exact' })

  if (searchQuery) {
    query = query.ilike('title', `%${searchQuery}%`)
  }

  const { data: posts, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  const totalPages = count ? Math.ceil(count / pageSize) : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Posts</h1>
          <p className="text-sm text-muted mt-1">Create, edit, and manage your blog discussions.</p>
        </div>
        <div className="flex items-center gap-3">
          <form action={async (formData: FormData) => {
            'use server'
            const q = formData.get('q')
            redirect(`/manage/posts?q=${q}`)
          }} className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent-blue transition-colors" />
            <input 
              name="q"
              type="text" 
              defaultValue={searchQuery}
              placeholder="Search posts..." 
              className="pl-10 pr-4 py-2 bg-header/50 border border-border rounded-lg text-sm focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/50 w-full md:w-64 transition-all"
            />
          </form>
          <Link 
            href="/manage/posts/new"
            className="flex items-center gap-2 bg-accent-blue hover:bg-accent-blue/90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
          >
            <Plus size={16} /> New Post
          </Link>
        </div>
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
                <td colSpan={4} className="px-6 py-12 text-center text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={32} className="opacity-20" />
                    <p>{searchQuery ? `No posts matching "${searchQuery}"` : 'No posts found. Start writing!'}</p>
                    {searchQuery && <Link href="/manage/posts" className="text-accent-blue hover:underline text-xs mt-2">Clear search</Link>}
                  </div>
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
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-header/50 border-t border-border">
            <p className="text-xs text-muted">
              Showing <span className="font-semibold text-foreground">{(page - 1) * pageSize + 1}</span> to <span className="font-semibold text-foreground">{Math.min(page * pageSize, count || 0)}</span> of <span className="font-semibold text-foreground">{count}</span> posts
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/manage/posts?page=${page - 1}${searchQuery ? `&q=${searchQuery}` : ''}`}
                className={`p-2 rounded-lg border border-border hover:bg-accent-blue/10 transition-all ${page <= 1 ? 'pointer-events-none opacity-20' : ''}`}
              >
                <ChevronLeft size={16} />
              </Link>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <Link
                    key={i + 1}
                    href={`/manage/posts?page=${i + 1}${searchQuery ? `&q=${searchQuery}` : ''}`}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${page === i + 1 ? 'bg-accent-blue border-accent-blue text-white' : 'border-border hover:bg-accent-blue/10 text-muted hover:text-foreground'}`}
                  >
                    {i + 1}
                  </Link>
                ))}
              </div>
              <Link
                href={`/manage/posts?page=${page + 1}${searchQuery ? `&q=${searchQuery}` : ''}`}
                className={`p-2 rounded-lg border border-border hover:bg-accent-blue/10 transition-all ${page >= totalPages ? 'pointer-events-none opacity-20' : ''}`}
              >
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

