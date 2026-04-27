"use client";

import Link from 'next/link'
import { ThumbsUp, MessageSquare } from 'lucide-react'

export function BookCard({ post }: { post: any }) {
  return (
    <div className="relative group" style={{ perspective: '1000px' }}>
      <Link
        href={`/blog/${post.slug}`}
        className="block relative z-10 w-full aspect-[2/3] bg-header border border-border/80 rounded-r-md rounded-l-sm overflow-hidden transition-all duration-500 hover:-translate-y-4"
        style={{ 
          boxShadow: '5px 5px 15px rgba(0,0,0,0.5), inset 4px 0 10px rgba(255,255,255,0.05)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-16px) rotateY(-8deg)';
          e.currentTarget.style.boxShadow = '10px 15px 25px rgba(0,0,0,0.6), inset 4px 0 10px rgba(255,255,255,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) rotateY(0)';
          e.currentTarget.style.boxShadow = '5px 5px 15px rgba(0,0,0,0.5), inset 4px 0 10px rgba(255,255,255,0.05)';
        }}
      >
        <div className="absolute top-0 left-0 bottom-0 w-3 bg-gradient-to-r from-background/80 via-header to-background/20 border-r border-border/30 z-20"></div>
        
        <div className="absolute inset-0 p-4 pl-6 flex flex-col justify-between bg-gradient-to-b from-transparent via-background/40 to-background/95">
          <div className="flex justify-between items-start">
            <div className="w-2 h-2 rounded-full bg-accent-blue/50"></div>
            <span className="font-mono text-[10px] text-muted/70 tracking-widest uppercase origin-top-right rotate-90 translate-x-3 mt-4">
              Vol.{new Date(post.created_at).getFullYear()}
            </span>
          </div>
          
          <div>
            <h2 className="text-sm font-bold text-foreground leading-snug line-clamp-4 group-hover:text-accent-blue transition-colors">
              {post.title}
            </h2>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-muted font-mono">
              <div className="flex items-center gap-1">
                <ThumbsUp size={10} /> {post.likes || 0}
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare size={10} /> 
              </div>
            </div>
          </div>
        </div>
      </Link>
      
      <div className="absolute -bottom-3 left-[-15%] right-[-15%] h-6 bg-black/50 blur-lg rounded-[100%] -z-10 transition-all duration-500 group-hover:scale-110 group-hover:opacity-40"></div>
      <div className="absolute -bottom-1 left-[-20%] right-[-20%] h-[2px] bg-gradient-to-r from-transparent via-border/80 to-transparent -z-10"></div>
    </div>
  )
}
