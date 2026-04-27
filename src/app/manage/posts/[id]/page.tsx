import { createClient } from '@/utils/supabase/server'
import { PostEditor } from '../PostEditor'
import { notFound } from 'next/navigation'

export const revalidate = 0

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const resolvedParams = await params;

  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (error || !post) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-foreground">Edit Post</h1>
        <p className="text-sm text-muted mt-1">Update your existing discussion post.</p>
      </div>
      
      <PostEditor post={post} />
    </div>
  )
}
