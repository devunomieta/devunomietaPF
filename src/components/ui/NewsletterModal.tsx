"use client";

import { useState } from "react";
import { subscribeAction } from "@/app/blog/actions";
import { Mail, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function NewsletterModal({ 
  isOpen, 
  onClose,
  onSuccess
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const res = await subscribeAction(formData);
    
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
        setLoading(false);
      }, 1500);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-50 p-6 glow"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground">
              <X size={18} />
            </button>

            {success ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 py-8">
                <CheckCircle2 size={48} className="text-accent-green" />
                <h3 className="font-semibold text-lg text-foreground">Welcome to the Library!</h3>
                <p className="text-sm text-muted">You can now leave comments and join the discussion.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent-blue/10 rounded-lg text-accent-blue">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">Join the Newsletter</h2>
                    <p className="text-xs text-muted">Subscribe to unlock commenting.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Full Name</label>
                    <input name="name" required className="w-full bg-header/50 border border-border rounded-md px-3 py-2 text-sm focus:border-accent-blue outline-none" placeholder="John Doe" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Display Name</label>
                    <input name="display_name" required className="w-full bg-header/50 border border-border rounded-md px-3 py-2 text-sm focus:border-accent-blue outline-none" placeholder="johndoe88" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Email Address</label>
                    <input type="email" name="email" required className="w-full bg-header/50 border border-border rounded-md px-3 py-2 text-sm focus:border-accent-blue outline-none" placeholder="john@example.com" />
                  </div>

                  {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="mt-2 w-full bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold py-2.5 rounded-md transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Subscribing...' : 'Subscribe & Unlock Comments'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
