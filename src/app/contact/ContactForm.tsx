"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Send, AlertCircle, Calendar, DollarSign, Clock } from "lucide-react";
import { submitInquiry } from "./actions";

export default function ContactForm({ error }: { error?: string }) {
  const searchParams = useSearchParams();
  const initialPurpose = searchParams.get("purpose") || "inquiry";

  const [purpose, setPurpose] = useState(initialPurpose);

  useEffect(() => {
    const p = searchParams.get("purpose");
    if (p) setPurpose(p);
  }, [searchParams]);

  return (
    <form className="flex flex-col gap-5 relative z-10" action={submitInquiry}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-xs font-semibold text-foreground uppercase tracking-wider">Your Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="John Doe"
            className="w-full bg-header/50 border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors placeholder:text-muted/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-foreground uppercase tracking-wider">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="john@example.com"
            className="w-full bg-header/50 border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors placeholder:text-muted/50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="purpose" className="text-xs font-semibold text-foreground uppercase tracking-wider">Purpose of Contact</label>
        <div className="relative">
          <select
            id="purpose"
            name="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full bg-header border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors appearance-none cursor-pointer"
            style={{ colorScheme: 'dark' }}
          >
            <option value="inquiry" className="bg-[#0d1117] text-white py-2">General Inquiry</option>
            <option value="hiring" className="bg-[#0d1117] text-white py-2">Hiring Request</option>
            <option value="consultation" className="bg-[#0d1117] text-white py-2">Consultation Call</option>
            <option value="other" className="bg-[#0d1117] text-white py-2">Other</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
            <Clock size={14} className="opacity-50" />
          </div>
        </div>
      </div>

      {/* Conditional Fields for Hiring */}
      {purpose === "hiring" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={12} className="text-accent-blue" />
              Budget Range
            </label>
            <select
              name="budget"
              className="w-full bg-header border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors"
              style={{ colorScheme: 'dark' }}
            >
              <option value="<$5k" className="bg-[#0d1117] text-white">Less than $5,000</option>
              <option value="$5k-$15k" className="bg-[#0d1117] text-white">$5,000 - $15,000</option>
              <option value="$15k-$50k" className="bg-[#0d1117] text-white">$15,000 - $50,000</option>
              <option value="$50k+" className="bg-[#0d1117] text-white">$50,000+</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock size={12} className="text-accent-blue" />
              Timeline
            </label>
            <select
              name="timeline"
              className="w-full bg-header border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors"
              style={{ colorScheme: 'dark' }}
            >
              <option value="immediate" className="bg-[#0d1117] text-white">Immediate Start</option>
              <option value="1-3-months" className="bg-[#0d1117] text-white">1-3 Months</option>
              <option value="3-6-months" className="bg-[#0d1117] text-white">3-6 Months</option>
              <option value="flexible" className="bg-[#0d1117] text-white">Flexible / Not set</option>
            </select>
          </div>
        </div>
      )}

      {/* Conditional Fields for Consultation */}
      {purpose === "consultation" && (
        <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <Calendar className="text-accent-blue mt-1 shrink-0" size={18} />
            <div>
              <h4 className="text-sm font-semibold text-foreground">Schedule a meeting?</h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                If you&apos;d like to book a call directly, you can use my scheduling link after submitting this form, or suggest a time in your message.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-xs font-semibold text-foreground uppercase tracking-wider">Message</label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder={purpose === "hiring" ? "Tell me about your project requirements..." : "How can I help you?"}
          className="w-full bg-header/50 border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-colors resize-y placeholder:text-muted/50"
        ></textarea>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-md flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <button
        type="submit"
        className="mt-2 bg-accent-blue hover:bg-accent-blue/90 text-white font-bold py-3 px-8 rounded-md shadow-lg shadow-accent-blue/20 transition-all flex items-center justify-center gap-2 w-fit"
      >
        <Send size={16} />
        Send Message
      </button>
    </form>
  );
}
