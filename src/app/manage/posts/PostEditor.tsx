"use client";

import { useState, useEffect } from "react";
import { savePost } from "./actions";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export function PostEditor({ post }: { post?: any }) {
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [content, setContent] = useState(post?.content || "");
  const [isPublished, setIsPublished] = useState(post?.is_published || false);
  const [postType, setPostType] = useState(post?.post_type || "markdown");
  const [autoSlug, setAutoSlug] = useState(!post); // Auto-generate slug only for new posts

  useEffect(() => {
    if (autoSlug && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setSlug(generatedSlug);
    }
  }, [title, autoSlug]);

  return (
    <form action={savePost} className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link href="/manage/posts" className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>
        <button type="submit" className="flex items-center gap-2 bg-accent-green hover:bg-accent-green/90 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors">
          <Save size={16} /> Save Post
        </button>
      </div>

      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">Title</label>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-header/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-blue"
            placeholder="e.g. My Awesome Post"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">URL Slug</label>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setAutoSlug(false); // Stop auto-generating if the user manually overrides it
            }}
            required
            className="w-full bg-header/50 border border-border rounded-md px-3 py-2 text-sm text-muted font-mono focus:outline-none focus:border-accent-blue"
            placeholder="e.g. my-awesome-post"
          />
        </div>

        <div className="flex items-center gap-2 mt-1">
          <input 
            type="checkbox" 
            name="is_published" 
            id="is_published"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <label htmlFor="is_published" className="text-sm font-medium text-foreground">Published (visible to public)</label>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">Post Type</label>
          <select 
            name="post_type" 
            value={postType}
            onChange={(e) => setPostType(e.target.value)}
            className="w-full bg-header/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-blue"
          >
            <option value="markdown">Standard Markdown</option>
            <option value="pdf">PDF Document</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">Attach Audio Read-Over (Optional)</label>
          <input type="file" name="audio_file" accept="audio/*" className="w-full text-sm text-muted bg-header/30 border border-border p-2 rounded-md" />
          {post?.audio_url && <p className="text-xs text-accent-blue mt-2">Currently attached audio. Uploading a new one will replace it.</p>}
          <input type="hidden" name="existing_audio_url" value={post?.audio_url || ''} />
        </div>

        {postType === 'pdf' && (
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">Upload PDF Document</label>
            <input type="file" name="pdf_file" accept="application/pdf" className="w-full text-sm text-muted bg-header/30 border border-border p-2 rounded-md" required={!post?.pdf_url} />
            {post?.pdf_url && <p className="text-xs text-accent-blue mt-2">Currently attached PDF. Uploading a new one will replace it.</p>}
            <input type="hidden" name="existing_pdf_url" value={post?.pdf_url || ''} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Markdown Content</label>
            <textarea
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={25}
              className="w-full bg-header/50 border border-border rounded-md px-4 py-3 text-sm text-foreground font-mono focus:outline-none focus:border-accent-blue resize-y leading-relaxed"
              placeholder="# Write your post here..."
            />
          </div>
          
          <div className="flex flex-col gap-1.5 h-full">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Live Preview</label>
            <div className="w-full h-full min-h-[500px] border border-border rounded-md p-6 overflow-y-auto bg-background glow">
              <div className="max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-foreground mt-4 mb-2 border-b border-border pb-1" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-foreground mt-4 mb-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-bold text-foreground mt-4 mb-2" {...props} />,
                    p: ({node, ...props}) => <div className="text-sm text-muted mb-4 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside text-sm text-muted mb-4" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside text-sm text-muted mb-4" {...props} />,
                    a: ({node, ...props}) => <a className="text-accent-blue hover:underline" {...props} />,
                    code: ({node, className, children, ...props}) => {
                      const isInline = !className?.includes('language-');
                      return isInline ? (
                        <code className="bg-header px-1.5 py-0.5 rounded text-accent-blue text-xs font-mono border border-border" {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre className="bg-header p-4 rounded-lg text-xs font-mono text-foreground border border-border mb-4 overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      );
                    },
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-accent-blue pl-4 italic text-muted my-4" {...props} />
                  }}
                >
                  {content || '*Live preview will appear here...*'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
