'use client'

import { useState } from 'react'
import { markAsRead, deleteInquiry } from './actions'
import { Mail, MailOpen, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react'

export default function InquiryList({ initialInquiries }: { initialInquiries: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {initialInquiries.map((inquiry) => (
        <div 
          key={inquiry.id} 
          className={`bg-header/20 border rounded-xl overflow-hidden transition-all ${inquiry.is_read ? 'border-border opacity-70' : 'border-accent-blue/50 ring-1 ring-accent-blue/20'}`}
        >
          <div 
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
            onClick={() => setExpandedId(expandedId === inquiry.id ? null : inquiry.id)}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${inquiry.is_read ? 'bg-muted/10 text-muted' : 'bg-accent-blue/10 text-accent-blue'}`}>
                {inquiry.is_read ? <MailOpen size={20} /> : <Mail size={20} />}
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  {inquiry.name}
                  {!inquiry.is_read && <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse"></span>}
                </h3>
                <p className="text-xs text-muted truncate max-w-xs md:max-w-md">{inquiry.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-muted">
              <div className="hidden md:flex items-center gap-1 text-xs">
                <Clock size={12} /> {new Date(inquiry.created_at).toLocaleDateString()}
              </div>
              {expandedId === inquiry.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>

          {expandedId === inquiry.id && (
            <div className="p-6 bg-header/30 border-t border-border animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {inquiry.purpose && (
                    <span className="px-2 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue text-[10px] font-bold uppercase tracking-wider">
                      {inquiry.purpose.replace('-', ' ')}
                    </span>
                  )}
                  {inquiry.metadata?.budget && (
                    <span className="px-2 py-0.5 rounded-full bg-accent-green/20 text-accent-green text-[10px] font-bold uppercase">
                      Budget: {inquiry.metadata.budget}
                    </span>
                  )}
                  {inquiry.metadata?.timeline && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase">
                      Timeline: {inquiry.metadata.timeline.replace('-', ' ')}
                    </span>
                  )}
                </div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {inquiry.message}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await markAsRead(inquiry.id, !inquiry.is_read);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${inquiry.is_read ? 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20' : 'bg-border/50 text-foreground hover:bg-border'}`}
                    >
                      Mark as {inquiry.is_read ? 'Unread' : 'Read'}
                    </button>
                    <a 
                      href={`mailto:${inquiry.email}?subject=Re: Inquiry from ${inquiry.name}`}
                      className="px-4 py-1.5 bg-accent-blue text-white rounded-lg text-xs font-semibold hover:bg-accent-blue/80 transition-all"
                    >
                      Reply via Email
                    </a>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Delete inquiry?')) await deleteInquiry(inquiry.id);
                    }}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {initialInquiries.length === 0 && (
        <div className="text-center py-20 text-muted bg-header/10 border border-dashed border-border rounded-xl">
          <Mail size={40} className="mx-auto mb-4 opacity-20" />
          <p>No inquiries found. Your inbox is empty!</p>
        </div>
      )}
    </div>
  )
}
