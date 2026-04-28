'use client'

import { useState, useEffect } from 'react'
import { markAsRead, deleteInquiry, replyToInquiry } from './actions'
import { Mail, MailOpen, Trash2, Clock, ChevronDown, ChevronUp, Search, ArrowLeft, ArrowRight, Send, CheckCircle2, Loader2 } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface InquiryListProps {
  initialConversations: any[]
  totalPages: number
  currentPage: number
  initialQuery: string
}

export default function InquiryList({ initialConversations, totalPages, currentPage, initialQuery }: InquiryListProps) {
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [replyMessage, setReplyMessage] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replySuccess, setReplySuccess] = useState<string | null>(null)
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== initialQuery) {
        const params = new URLSearchParams(searchParams.toString())
        if (searchQuery) params.set('query', searchQuery)
        else params.delete('query')
        params.set('page', '1') // Reset to page 1 on search
        router.push(`${pathname}?${params.toString()}`)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, initialQuery, pathname, router, searchParams])

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleReply = async (inquiryId: string, email: string, name: string) => {
    if (!replyMessage.trim()) return
    setSendingReply(true)
    const result = await replyToInquiry(inquiryId, email, name, replyMessage)
    if (result.success) {
      setReplySuccess(email)
      setReplyMessage('')
      setShowReplyForm(null)
      setTimeout(() => setReplySuccess(null), 3000)
    } else {
      alert(result.error || 'Failed to send reply')
    }
    setSendingReply(false)
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent-blue transition-colors" size={18} />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-header/20 border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-all"
        />
      </div>

      <div className="space-y-4">
        {initialConversations.map((conv) => (
          <div
            key={conv.email}
            className={`bg-header/20 border rounded-xl overflow-hidden transition-all ${conv.is_read ? 'border-border opacity-70' : 'border-accent-blue/50 ring-1 ring-accent-blue/20'}`}
          >
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
              onClick={() => setExpandedEmail(expandedEmail === conv.email ? null : conv.email)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${conv.is_read ? 'bg-muted/10 text-muted' : 'bg-accent-blue/10 text-accent-blue'}`}>
                  {conv.is_read ? <MailOpen size={20} /> : <Mail size={20} />}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {conv.name}
                    {!conv.is_read && <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse"></span>}
                    {conv.inquiries.some((i: any) => i.replied_at) && (
                      <span className="flex items-center gap-1 text-[10px] text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full uppercase font-bold">
                        <CheckCircle2 size={10} /> Replied
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted truncate max-w-xs md:max-w-md">{conv.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-muted">
                <div className="hidden md:flex items-center gap-1 text-[10px]">
                  <Clock size={12} /> {new Date(conv.latest_at).toLocaleDateString()}
                </div>
                <div className="px-2 py-0.5 rounded-md bg-border/30 text-[10px] font-mono">
                  {conv.inquiries.length} msg
                </div>
                {expandedEmail === conv.email ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            {expandedEmail === conv.email && (
              <div className="p-6 bg-header/30 border-t border-border animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-8">
                  <div className="space-y-6 pt-4 border-t border-border/50">
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border/30 pb-2">Conversation History</h4>
                    
                    <div className="max-h-[500px] overflow-y-auto pr-3 space-y-8 custom-scrollbar">
                      {/* Chronological Message Flow */}
                      {[...conv.inquiries].reverse().map((inquiry: any) => (
                        <div key={inquiry.id} className="space-y-4">
                          {/* User Inquiry Message */}
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex flex-wrap gap-2 mb-1">
                              {inquiry.purpose && (
                                <span className="px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue text-[9px] font-bold uppercase">
                                  {inquiry.purpose.replace('-', ' ')}
                                </span>
                              )}
                              {inquiry.metadata?.budget && (
                                <span className="px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green text-[9px] font-bold uppercase">
                                  Budget: {inquiry.metadata.budget}
                                </span>
                              )}
                            </div>
                            <div className="bg-header/50 border border-border/50 rounded-2xl rounded-tl-none p-4 max-w-[90%] md:max-w-[80%] text-sm text-foreground shadow-sm">
                              {inquiry.message}
                            </div>
                            <span className="text-[10px] text-muted ml-1 flex items-center gap-1">
                              <Clock size={10} /> {new Date(inquiry.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>

                          {/* Admin Replies for this specific inquiry */}
                          {inquiry.inquiry_replies?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((reply: any) => (
                            <div key={reply.id} className="flex flex-col items-end gap-1">
                              <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-2xl rounded-tr-none p-4 max-w-[90%] md:max-w-[80%] text-sm text-foreground shadow-sm">
                                {reply.message}
                              </div>
                              <span className="text-[10px] text-muted mr-1 flex items-center gap-1">
                                Admin • {new Date(reply.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-border/50">
                    {!showReplyForm && replySuccess !== conv.email && (
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Mark all inquiries in conversation as read
                              await Promise.all(conv.inquiries.map((i: any) => markAsRead(i.id, !conv.is_read)))
                            }}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${conv.is_read ? 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20' : 'bg-border/50 text-foreground hover:bg-border'}`}
                          >
                            Mark all as {conv.is_read ? 'Unread' : 'Read'}
                          </button>
                          <button
                            onClick={() => setShowReplyForm(conv.email)}
                            className="px-4 py-1.5 bg-accent-blue text-white rounded-lg text-xs font-semibold hover:bg-accent-blue/80 transition-all"
                          >
                            Reply Now
                          </button>
                          <a
                            href={`mailto:${conv.email}?subject=Re: Conversation with ${conv.name}`}
                            className="px-4 py-1.5 bg-header border border-border text-foreground rounded-lg text-xs font-semibold hover:border-accent-blue transition-all"
                          >
                            Reply Externally
                          </a>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Delete entire conversation with ${conv.email}?`)) {
                                await Promise.all(conv.inquiries.map((i: any) => deleteInquiry(i.id)))
                              }
                            }}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all"
                            title="Delete Conversation"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )}

                    {showReplyForm === conv.email && (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground">Reply to {conv.name}</h4>
                          <button onClick={() => setShowReplyForm(null)} className="text-xs text-muted hover:text-foreground">Cancel</button>
                        </div>
                        <textarea
                          className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-all resize-none shadow-inner"
                          placeholder="Write your response here..."
                          rows={4}
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                        />
                        <div className="flex justify-end">
                          <button
                            disabled={sendingReply || !replyMessage.trim()}
                            onClick={() => handleReply(conv.inquiries[0].id, conv.email, conv.name)}
                            className="flex items-center gap-2 px-6 py-2 bg-accent-blue text-white rounded-lg text-sm font-bold hover:bg-accent-blue/80 transition-all disabled:opacity-50 shadow-lg shadow-accent-blue/20"
                          >
                            {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Send Reply
                          </button>
                        </div>
                      </div>
                    )}

                    {replySuccess === conv.email && (
                      <div className="flex items-center gap-2 text-accent-green bg-accent-green/10 border border-accent-green/20 p-4 rounded-xl animate-in zoom-in-95 duration-200">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-semibold">Reply sent successfully via Brevo!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-border/30">
          <p className="text-xs text-muted">Page <span className="text-foreground font-mono">{currentPage}</span> of <span className="text-foreground font-mono">{totalPages}</span></p>
          <div className="flex gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 border border-border rounded-lg text-muted hover:text-foreground hover:bg-white/5 disabled:opacity-30 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 border border-border rounded-lg text-muted hover:text-foreground hover:bg-white/5 disabled:opacity-30 transition-all"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {initialConversations.length === 0 && (
        <div className="text-center py-20 text-muted bg-header/10 border border-dashed border-border rounded-xl">
          <Mail size={40} className="mx-auto mb-4 opacity-20" />
          <p>No conversations found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}

