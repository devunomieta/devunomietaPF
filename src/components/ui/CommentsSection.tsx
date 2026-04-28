"use client";

import { useState } from "react";
import { postCommentAction, reactToCommentAction, deleteCommentAction } from "@/app/blog/actions";
import { NewsletterModal } from "./NewsletterModal";
import { MessageSquare, CornerDownRight, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";

type Comment = {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  likes: number;
  dislikes: number;
  subscriber: {
    display_name: string;
    avatar_url: string;
  };
};

export function CommentsSection({ 
  postId, 
  comments, 
  isSubscribedInitially 
}: { 
  postId: string; 
  comments: Comment[]; 
  isSubscribedInitially: boolean;
}) {
  const [isSubscribed, setIsSubscribed] = useState(isSubscribedInitially);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCommentSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    if (!isSubscribed) {
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    const res = await postCommentAction(postId, newComment, parentId || undefined);
    if (res.success) {
      setNewComment("");
      setReplyingTo(null);
    }
    setLoading(false);
  };

  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    await reactToCommentAction(commentId, type);
  };

  const handleDelete = async (commentId: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      await deleteCommentAction(commentId);
    }
  };

  // Helper to build comment tree
  const buildTree = (parentId: string | null = null): Comment[] => {
    return comments.filter(c => c.parent_id === parentId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const CommentNode = ({ comment, level = 0 }: { comment: Comment, level?: number }) => {
    const children = buildTree(comment.id);
    
    return (
      <div className={`mt-4 ${level > 0 ? "ml-4 md:ml-8 pl-4 md:pl-6 border-l-2 border-border/50" : ""}`}>
        <div className="flex gap-3">
          {/* Avatar */}
          <img src={comment.subscriber.avatar_url} alt={comment.subscriber.display_name} className="w-8 h-8 rounded-full bg-header border border-border" />
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{comment.subscriber.display_name}</span>
                <span className="text-xs text-muted font-mono">{new Date(comment.created_at).toLocaleDateString()}</span>
              </div>
              <button 
                onClick={() => handleDelete(comment.id)}
                className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete comment (Admin)"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <p className="text-sm text-muted/90 leading-relaxed mb-3 whitespace-pre-wrap">{comment.content}</p>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-xs font-semibold text-muted hover:text-accent-blue transition-colors flex items-center gap-1"
              >
                <CornerDownRight size={12} /> Reply
              </button>

              <div className="flex items-center gap-3 ml-auto">
                <button 
                  onClick={() => handleReaction(comment.id, 'like')}
                  className="flex items-center gap-1 text-[10px] font-mono text-muted hover:text-accent-green transition-colors"
                >
                  <ThumbsUp size={12} /> {comment.likes || 0}
                </button>
                <button 
                  onClick={() => handleReaction(comment.id, 'dislike')}
                  className="flex items-center gap-1 text-[10px] font-mono text-muted hover:text-red-400 transition-colors"
                >
                  <ThumbsDown size={12} /> {comment.dislikes || 0}
                </button>
              </div>
            </div>

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <form onSubmit={(e) => handleCommentSubmit(e, comment.id)} className="mt-4 flex flex-col gap-2">
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={`Reply to ${comment.subscriber.display_name}...`}
                  className="w-full bg-header/30 border border-border rounded-md p-3 text-sm focus:border-accent-blue outline-none resize-none h-20"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setReplyingTo(null)} className="px-3 py-1.5 text-xs text-muted hover:text-foreground">Cancel</button>
                  <button type="submit" disabled={loading} className="bg-accent-blue text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50">
                    {loading ? 'Posting...' : 'Post Reply'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Render Children */}
        {children.length > 0 && (
          <div className="mt-2">
            {children.map(child => <CommentNode key={child.id} comment={child} level={level + 1} />)}
          </div>
        )}
      </div>
    );
  };

  const topLevelComments = buildTree(null);

  return (
    <div className="mt-12">
      <div className="flex items-center gap-2 mb-8">
        <MessageSquare size={20} className="text-foreground" />
        <h3 className="text-xl font-bold text-foreground">Discussion ({comments.length})</h3>
      </div>

      {/* Main Comment Input */}
      {!replyingTo && (
        <form onSubmit={(e) => handleCommentSubmit(e, null)} className="mb-10 flex flex-col gap-3">
          <textarea 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onClick={() => { if (!isSubscribed) setIsModalOpen(true); }}
            placeholder="Share your thoughts..."
            className="w-full bg-header/50 border border-border rounded-lg p-4 text-sm focus:border-accent-blue outline-none resize-none h-24"
            readOnly={!isSubscribed}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">
              {isSubscribed ? "You are subscribed and can comment." : "Join the newsletter to comment."}
            </span>
            <button 
              type="submit" 
              disabled={loading || !newComment.trim()} 
              className={`bg-accent-blue hover:bg-accent-blue/90 text-white px-5 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${!isSubscribed ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={(e) => {
                if (!isSubscribed) {
                  e.preventDefault();
                  setIsModalOpen(true);
                }
              }}
            >
              {loading ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="flex flex-col gap-6">
        {topLevelComments.length === 0 ? (
          <p className="text-sm text-muted text-center py-8 italic border border-dashed border-border rounded-xl">No comments yet. Be the first to start the discussion!</p>
        ) : (
          topLevelComments.map(comment => <CommentNode key={comment.id} comment={comment} />)
        )}
      </div>

      <NewsletterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => setIsSubscribed(true)} 
      />
    </div>
  );
}
