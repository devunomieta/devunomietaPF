'use client'

import { useState } from 'react'
import { Mail, Loader2, Check, X } from 'lucide-react'
import { broadcastPostAction } from './actions'

interface BroadcastActionButtonProps {
  postId: string
  postTitle: string
}

export function BroadcastActionButton({ postId, postTitle }: BroadcastActionButtonProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  const handleBroadcast = async () => {
    const confirmSend = window.confirm(
      `📣 Broadcast Newsletter Alert\n\nAre you sure you want to format and broadcast "${postTitle}" to all active newsletter subscribers right now?`
    )
    
    if (!confirmSend) return

    setState('sending')
    try {
      const result = await broadcastPostAction(postId)
      
      if (result.success) {
        setState('success')
        alert(`✨ Broadcast Complete!\nSuccessfully compiled and dispatched newsletter to ${result.sentCount} active subscribers.`)
        // Reset back to original icon state after a short delay
        setTimeout(() => setState('idle'), 4000)
      } else {
        setState('error')
        alert(`❌ Broadcast Incomplete\nServer reported: ${result.error || 'Mailing pipeline rejected dispatch'}`)
        setTimeout(() => setState('idle'), 4000)
      }
    } catch (err) {
      console.error('Direct broadcast component exception:', err)
      setState('error')
      alert(`❌ Network Error\nFailed to establish connection to the Brevo dispatch action.`)
      setTimeout(() => setState('idle'), 4000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBroadcast}
      disabled={state === 'sending'}
      className={`relative transition-all flex items-center justify-center ${
        state === 'sending'
          ? 'text-accent-blue cursor-wait'
          : state === 'success'
          ? 'text-accent-green scale-110'
          : state === 'error'
          ? 'text-red-400 animate-shake'
          : 'text-muted hover:text-accent-blue hover:bg-accent-blue/10 p-1.5 rounded-md'
      }`}
      title={state === 'sending' ? "Dispatching newsletter..." : "Broadcast to Subscribers"}
    >
      {state === 'idle' && <Mail size={16} />}
      {state === 'sending' && <Loader2 size={16} className="animate-spin" />}
      {state === 'success' && <Check size={16} />}
      {state === 'error' && <X size={16} />}
    </button>
  )
}
