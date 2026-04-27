import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { FileText } from 'lucide-react'
import { BookCard } from '@/components/ui/BookCard'

export const revalidate = 0

export default async function BlogIndexPage() {
  const supabase = await createClient()

  // Select all posts. We will use a raw query because 'likes' might not exist yet if the user hasn't run the SQL
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-12 pb-20 mt-4">
      <div className="flex flex-col items-center text-center gap-4 border-b border-border pb-10 relative">
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-accent-blue/30 to-transparent"></div>
        <FileText size={32} className="text-accent-blue mt-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">The Digital Library</h1>
        <p className="text-muted max-w-2xl text-sm md:text-base leading-relaxed">
          A curated collection of thoughts, deep dives, and technical literature. Browse the shelves, read the materials, and join the discussion.
        </p>
      </div>

      <div className="w-full">
        {!posts || posts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <p className="text-muted">The shelves are empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-16 pt-4">
            {posts.map((post) => (
              <BookCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
