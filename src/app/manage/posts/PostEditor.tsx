"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { savePost, broadcastPostAction } from "./actions";
import { ArrowLeft, Save, Edit3, Eye, Loader2, Mail, Check, X } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export function PostEditor({ post }: { post?: any }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [content, setContent] = useState(post?.content || "");
  const [isPublished, setIsPublished] = useState(post?.is_published || false);
  const [postType, setPostType] = useState(post?.post_type || "markdown");
  const [autoSlug, setAutoSlug] = useState(!post); 
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [previewCoverUrl, setPreviewCoverUrl] = useState<string>("");

  // Broadcast Flow State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [savedPostInfo, setSavedPostInfo] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [broadcastState, setBroadcastState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [broadcastCount, setBroadcastCount] = useState(0);
  const [broadcastErrorMessage, setBroadcastErrorMessage] = useState("");

  useEffect(() => {
    if (autoSlug && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setSlug(generatedSlug);
    }
  }, [title, autoSlug]);

  useEffect(() => {
    return () => {
      if (previewCoverUrl) {
        URL.revokeObjectURL(previewCoverUrl);
      }
    };
  }, [previewCoverUrl]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewCoverUrl) {
        URL.revokeObjectURL(previewCoverUrl);
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewCoverUrl(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("is_published", isPublished ? "on" : "off");

      const response = await savePost(formData);
      
      if (response.success && response.post) {
        setSavedPostInfo({
          id: response.post.id!,
          title: response.post.title,
          slug: response.post.slug!
        });

        if (isPublished) {
          setShowBroadcastModal(true);
        } else {
          router.push("/manage/posts");
        }
      } else {
        alert(`Error while saving post: ${response.error}`);
      }
    } catch (err) {
      console.error("Failure submitting post:", err);
      alert("An unexpected networking exception halted saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBroadcastNow = async () => {
    if (!savedPostInfo) return;
    setBroadcastState("sending");

    try {
      const response = await broadcastPostAction(savedPostInfo.id);
      if (response.success) {
        setBroadcastCount(response.sentCount || 0);
        setBroadcastState("success");
      } else {
        setBroadcastErrorMessage(response.error || "Database rejected mail queue.");
        setBroadcastState("error");
      }
    } catch (err) {
      setBroadcastErrorMessage("Internet timeout connecting to Brevo relay.");
      setBroadcastState("error");
    }
  };

  const handleCloseAndRedirect = () => {
    router.push("/manage/posts");
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link href="/manage/posts" className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>
        <button 
          type="submit" 
          disabled={isSaving}
          className={`flex items-center gap-2 bg-accent-green hover:bg-accent-green/90 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            isSaving ? "opacity-50 cursor-wait" : ""
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save size={16} /> Save Post
            </>
          )}
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
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">Featured Cover Image (Optional)</label>
          <input 
            type="file" 
            name="cover_image_file" 
            accept="image/*" 
            onChange={handleCoverImageChange}
            className="w-full text-sm text-muted bg-header/30 border border-border p-2 rounded-md" 
          />
          
          {(previewCoverUrl || post?.cover_image_url) && (
            <div className="mt-3 flex flex-col items-start gap-2 bg-header/20 p-3 rounded-md border border-border/50 max-w-xs">
              <span className="text-[10px] font-bold text-muted uppercase">Cover Aspect Preview (2:3):</span>
              <div className="relative w-28 aspect-[2/3] bg-background rounded border border-border shadow-lg overflow-hidden">
                <img 
                  src={previewCoverUrl || post.cover_image_url} 
                  className="absolute inset-0 w-full h-full object-cover" 
                  alt="Cover preview" 
                />
              </div>
              <p className="text-[10px] text-accent-blue italic">
                {previewCoverUrl ? "✨ Ready to upload! Click Save Post to store." : "✅ Saved in library."}
              </p>
            </div>
          )}
          <input type="hidden" name="existing_cover_image_url" value={post?.cover_image_url || ''} />
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

        {/* GitHub style write vs preview tab selector */}
        <div className="mt-4 flex items-center border-b border-border/60 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "write"
                ? "border-accent-blue text-accent-blue bg-accent-blue/5"
                : "border-transparent text-muted hover:text-foreground hover:bg-header/30"
            }`}
          >
            <Edit3 size={16} />
            Write Markdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "preview"
                ? "border-accent-blue text-accent-blue bg-accent-blue/5"
                : "border-transparent text-muted hover:text-foreground hover:bg-header/30"
            }`}
          >
            <Eye size={16} />
            Live Preview
          </button>
        </div>

        <div className="mt-3">
          {activeTab === "write" ? (
            <div className="flex flex-col gap-1.5">
              <textarea
                name="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={28}
                className="w-full bg-header/50 border border-border rounded-md px-4 py-3 text-sm text-foreground font-mono focus:outline-none focus:border-accent-blue resize-y leading-relaxed"
                placeholder="# Write your post here..."
              />
            </div>
          ) : (
            <div className="w-full min-h-[600px] border border-border rounded-md p-6 md:p-8 overflow-y-auto bg-background glow">
              <div className="max-w-3xl mx-auto">
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-foreground mt-6 mb-4 border-b border-border pb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-foreground mt-6 mb-3 pb-1 border-b border-border/30" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-xl font-bold text-foreground mt-5 mb-2" {...props} />,
                    p: ({node, ...props}) => <p className="text-base text-muted mb-5 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-6 text-base text-muted mb-5 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 text-base text-muted mb-5 space-y-1" {...props} />,
                    a: ({node, ...props}) => <a className="text-accent-blue hover:underline font-medium" {...props} />,
                    code: ({node, className, children, ...props}) => {
                      const isInline = !className?.includes('language-');
                      return isInline ? (
                        <code className="bg-header px-1.5 py-0.5 rounded text-accent-blue text-sm font-mono border border-border" {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre className="bg-header p-4 rounded-xl text-sm font-mono text-foreground border border-border mb-5 overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      );
                    },
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-accent-blue bg-accent-blue/5 px-5 py-3 italic text-muted my-5 rounded-r-lg" {...props} />
                  }}
                >
                  {content || '*Live preview will appear here...*'}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>

      {showBroadcastModal && savedPostInfo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Glassy overlay background */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[6px]" />
          
          {/* Inner card modal */}
          <div className="relative w-full max-w-md bg-[#0f172a] border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 glow">
            <div className="p-7 flex flex-col items-center text-center">
              
              {broadcastState === 'idle' && (
                <>
                  <div className="w-16 h-16 bg-accent-blue/10 text-accent-blue rounded-full flex items-center justify-center mb-5 border border-accent-blue/20">
                    <Mail size={30} className="animate-pulse" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">📬 Post Saved Successfully!</h2>
                  <p className="text-sm text-muted mb-6 leading-relaxed">
                    Your publication <strong>"{savedPostInfo.title}"</strong> is now live. Would you like to broadcast this release as a beautiful dual-mode newsletter to all subscribers right now?
                  </p>
                  <div className="flex flex-col w-full gap-3 mt-1">
                    <button
                      onClick={handleBroadcastNow}
                      className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-accent-blue/10 hover:shadow-accent-blue/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Mail size={16} /> Yes, Send Broadcast Mail
                    </button>
                    <button
                      onClick={handleCloseAndRedirect}
                      className="w-full bg-header/50 border border-border hover:bg-header text-muted hover:text-foreground py-3 rounded-xl font-semibold text-xs tracking-wide transition-all"
                    >
                      Maybe Later
                    </button>
                  </div>
                </>
              )}

              {broadcastState === 'sending' && (
                <>
                  <div className="w-16 h-16 bg-accent-blue/5 text-accent-blue rounded-full flex items-center justify-center mb-5 border border-accent-blue/10">
                    <Loader2 size={32} className="animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Broadcasting Emails...</h2>
                  <p className="text-sm text-muted mb-6 leading-relaxed">
                    Compiling and formatting premium dark/light mode layouts. Batch sending via Brevo relays in parallel. Keep this window open...
                  </p>
                </>
              )}

              {broadcastState === 'success' && (
                <>
                  <div className="w-16 h-16 bg-accent-green/10 text-accent-green rounded-full flex items-center justify-center mb-5 border border-accent-green/20 animate-bounce">
                    <Check size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">✨ Successfully Sent!</h2>
                  <p className="text-sm text-muted mb-6 leading-relaxed">
                    Everything went perfectly! Your post newsletter was broadcasted successfully to <strong>{broadcastCount}</strong> active subscribers.
                  </p>
                  <button
                    onClick={handleCloseAndRedirect}
                    className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all"
                  >
                    Back to Dashboard
                  </button>
                </>
              )}

              {broadcastState === 'error' && (
                <>
                  <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-5 border border-red-500/20">
                    <X size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Broadcast Encountered Errors</h2>
                  <p className="text-sm text-red-400/80 mb-6 leading-relaxed bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                    {broadcastErrorMessage}
                  </p>
                  <div className="flex flex-col w-full gap-3 mt-1">
                    <button
                      onClick={handleBroadcastNow}
                      className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white py-3 rounded-xl font-bold text-sm transition-all"
                    >
                      Retry Sending
                    </button>
                    <button
                      onClick={handleCloseAndRedirect}
                      className="w-full bg-header/40 border border-border hover:bg-header text-muted py-3 rounded-xl font-semibold text-xs transition-all"
                    >
                      Close & Skip
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
