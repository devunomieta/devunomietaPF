"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { subscribeAction } from "./actions";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const result = await subscribeAction(email, name);
    if (result.success) {
      setSuccess(true);
      setEmail("");
      setName("");
    } else {
      setError(result.error || "Failed to subscribe");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="bg-accent-green/10 border border-accent-green/20 rounded-xl p-6 text-center animate-in zoom-in-95 duration-300">
        <CheckCircle2 size={32} className="text-accent-green mx-auto mb-3" />
        <h3 className="font-bold text-foreground">Welcome to the inner circle!</h3>
        <p className="text-sm text-muted mt-1">Thanks for subscribing. I&apos;ll keep you posted.</p>
      </div>
    );
  }

  return (
    <div className="bg-header/20 border border-border rounded-xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-accent-blue/10 p-2 rounded-lg text-accent-blue">
          <Mail size={20} />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Join the Newsletter</h3>
          <p className="text-xs text-muted">Technical insights, deep dives, and project updates.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Your Name (Optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground outline-none focus:border-accent-blue transition-all"
        />
        <input
          type="email"
          required
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground outline-none focus:border-accent-blue transition-all"
        />
        {error && <p className="text-[10px] text-red-400 px-1">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent-blue text-white font-bold py-2 rounded-lg text-sm hover:bg-accent-blue/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Subscribe Now"}
        </button>
      </form>
      <p className="text-[10px] text-muted text-center mt-3 opacity-50">
        No spam, just quality content. Unsubscribe anytime.
      </p>
    </div>
  );
}
