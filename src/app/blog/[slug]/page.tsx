import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react'
import { Reactions } from '@/components/ui/Reactions'
import { CommentsSection } from '@/components/ui/CommentsSection'
import { ReadingProgress } from '@/components/ui/ReadingProgress'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
import { PdfViewer } from '@/components/ui/PdfViewer'
import { cookies } from 'next/headers'
import { NewsletterSection } from '@/components/ui/NewsletterSection'

export const revalidate = 0

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  const resolvedParams = await params;
  
  const { data: post } = await supabase
    .from('posts')
    .select('title')
    .eq('slug', resolvedParams.slug)
    .single()

  if (!post) return { title: 'Post Not Found' }
  
  return {
    title: `${post.title} | Joseph Unomieta`,
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()

  // Ensure params is awaited if Next.js expects it in app router (Next.js 15)
  const resolvedParams = await params;

  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .eq('is_published', true)
    .single()

  if (error || !post) {
    notFound()
  }

  // Fetch comments with subscriber details
  const { data: comments } = await supabase
    .from('comments')
    .select(`
      id,
      parent_id,
      content,
      created_at,
      subscriber:subscribers(display_name, avatar_url)
    `)
    .eq('post_id', post.id)
    .order('created_at', { ascending: true })

  // Check if current user is subscribed
  const cookieStore = await cookies()
  const isSubscribed = !!cookieStore.get('subscriber_id')?.value

  return (
    <>
      <ReadingProgress />
      <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-16 mt-4">
        <Link href="/blog" className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit">
          <ArrowLeft size={16} />
          Back to Library
        </Link>

      <div className="flex flex-col gap-4 border-b border-border pb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
          {post.title}
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-muted">
          <div className="flex items-center gap-1.5">
            <User size={16} className="text-accent-blue" />
            <span>Joseph Unomieta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={16} />
            <time dateTime={post.created_at}>
              {new Date(post.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={16} className="text-muted" />
            <span>{post.read_time || 1} min read</span>
          </div>
        </div>
      </div>

      {post.audio_url && <AudioPlayer src={post.audio_url} />}

      {post.post_type === 'pdf' && post.pdf_url ? (
        <PdfViewer src={post.pdf_url} title={post.title} />
      ) : (
        <div className="max-w-none">
          <ReactMarkdown
          components={{
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-foreground mt-8 mb-4 border-b border-border pb-2" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-foreground mt-8 mb-4 border-b border-border pb-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-bold text-foreground mt-6 mb-3" {...props} />,
            p: ({node, ...props}) => <div className="text-muted text-base leading-relaxed mb-4" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside text-muted mb-4 space-y-1 ml-4" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside text-muted mb-4 space-y-1 ml-4" {...props} />,
            li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
            a: ({node, ...props}) => <a className="text-accent-blue hover:underline" {...props} />,
            code: ({node, className, children, ...props}) => {
              const match = /language-(\w+)/.exec(className || '')
              const isInline = !className?.includes('language-')
              
              return !isInline ? (
                <div className="my-6 rounded-xl overflow-hidden border border-border bg-header shadow-md glow">
                  <div className="px-4 py-2 border-b border-border flex items-center bg-background/50">
                    <span className="text-xs font-mono text-muted uppercase tracking-wider">{match ? match[1] : 'code'}</span>
                  </div>
                  <pre className="p-4 overflow-x-auto">
                    <code className="text-sm font-mono text-foreground/90" {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              ) : (
                <code className="bg-header px-1.5 py-0.5 rounded text-sm text-accent-blue font-mono border border-border" {...props}>
                  {children}
                </code>
              )
            },
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-accent-blue pl-4 italic text-muted my-4 bg-accent-blue/5 py-2 rounded-r-md" {...props} />
          }}
        >
          {post.content}
        </ReactMarkdown>
        </div>
      )}

      <Reactions 
        postId={post.id} 
        initialLikes={post.likes || 0} 
        initialDislikes={post.dislikes || 0} 
      />

      <CommentsSection 
        postId={post.id} 
        comments={(comments as any) || []} 
        isSubscribedInitially={isSubscribed} 
      />

      <NewsletterSection />
    </div>
    </>
  )
}
