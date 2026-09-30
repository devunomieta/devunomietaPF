"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Send,
  Search,
  PenSquare,
  RefreshCw,
  CornerUpLeft,
  Paperclip,
  Check,
  AlertCircle,
  Clock,
  ArrowLeft,
  Mail,
  MailOpen,
  Sparkles,
} from "lucide-react";
import type { CrmThread, CrmMessage } from "@/lib/crm/types";
import { CrmModal, crmInputClass, crmLabelClass, crmPrimaryBtnClass } from "@/components/crm/CrmModal";
import { CrmPageGuide } from "@/components/crm/CrmPageGuide";
import { MailboxRichEditor } from "@/components/crm/mailbox/MailboxRichEditor";
import ReactMarkdown from "react-markdown";
import {
  getThreads,
  getThreadMessages,
  replyToThread,
  composeNewEmail,
  simulateInboundReply,
} from "./actions";

interface MailboxClientProps {
  initialThreads: CrmThread[];
  currentFolder: string;
  initialThreadId: string | null;
  searchQuery: string;
  canSend: boolean;
  isSuperAdmin: boolean;
  senderEmail: string;
}

export function MailboxClient({
  initialThreads,
  currentFolder,
  initialThreadId,
  searchQuery,
  canSend,
  isSuperAdmin,
  senderEmail,
}: MailboxClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active Tab: "inbox" (Customer replies & incoming mail) vs "sent" (Direct 1:1 outbound sent from mailbox)
  const activeTab = currentFolder === "sent" ? "sent" : "inbox";

  // Selected thread & messages
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId);
  const [messages, setMessages] = useState<CrmMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Threads state (initialized from server, dynamically updated in realtime)
  const [threads, setThreads] = useState<CrmThread[]>(initialThreads);
  const [isSearching, setIsSearching] = useState(false);

  // Sync threads when server revalidates initialThreads
  useEffect(() => {
    setThreads(initialThreads);
  }, [initialThreads]);

  // Search state
  const [search, setSearch] = useState(searchQuery);

  // Realtime search with 250ms debounce
  useEffect(() => {
    // If search is unchanged from the initial server query, do nothing
    const query = search.trim();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await getThreads({
          folder: activeTab,
          search: query,
        });
        setThreads(results);
      } catch (err) {
        console.error("Realtime search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search, activeTab]);

  // Reply box state
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Compose Modal state
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeName, setComposeName] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  // Simulate Inbound Modal state
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simEmail, setSimEmail] = useState("client@example.com");
  const [simName, setSimName] = useState("Alex Vance");
  const [simSubject, setSimSubject] = useState("Re: Project quotation inquiry");
  const [simMessage, setSimMessage] = useState(
    "Hi! We reviewed your proposal and are excited to move forward with the next milestone. When can we talk?"
  );
  const [isSimulating, setIsSimulating] = useState(false);

  // Fetch messages when thread is selected
  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setReplyError(null);
    getThreadMessages(selectedThreadId)
      .then((msgs) => {
        setMessages(msgs);
        setLoadingMessages(false);
      })
      .catch((err) => {
        console.error("Error loading messages:", err);
        setLoadingMessages(false);
      });
  }, [selectedThreadId]);

  // Handle Tab switch
  const switchTab = (tab: "inbox" | "sent") => {
    setSelectedThreadId(null);
    setSearch("");
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("folder", tab);
      router.push(`/crm/mailbox?${params.toString()}`);
    });
  };

  // Handle Search submit (allows Enter to update URL if desired, but search already happened in realtime)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("folder", activeTab);
    if (search.trim()) params.set("q", search.trim());
    router.replace(`/crm/mailbox?${params.toString()}`);
  };

  // Helper to extract clean plain text from HTML
  const stripHtmlToText = (html: string): string => {
    return html
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
  };

  // Send Reply
  const handleSendReply = async () => {
    const cleanText = stripHtmlToText(replyText);
    if (!selectedThreadId || (!cleanText && !replyText.includes("<img"))) return;
    setIsSendingReply(true);
    setReplyError(null);

    // If already wrapped in HTML or formatted, preserve, otherwise wrap cleanly
    const htmlContent = replyText.includes("<")
      ? `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827;">${replyText}</div>`
      : `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827;">${replyText.replace(/\n/g, "<br/>")}</div>`;

    const res = await replyToThread({
      threadId: selectedThreadId,
      messageText: cleanText || replyText,
      messageHtml: htmlContent,
    });

    setIsSendingReply(false);
    if (res.error) {
      setReplyError(res.error);
    } else {
      setReplyText("");
      const updated = await getThreadMessages(selectedThreadId);
      setMessages(updated);
      router.refresh();
    }
  };

  // Send Compose
  const handleSendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = stripHtmlToText(composeBody);
    if (!composeTo || !composeSubject || (!cleanText && !composeBody.includes("<img"))) return;
    setIsComposing(true);
    setComposeError(null);

    const htmlContent = composeBody.includes("<")
      ? `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827;">${composeBody}</div>`
      : `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827;">${composeBody.replace(/\n/g, "<br/>")}</div>`;

    const res = await composeNewEmail({
      toEmail: composeTo,
      toName: composeName || undefined,
      subject: composeSubject,
      messageText: cleanText || composeBody,
      messageHtml: htmlContent,
    });

    setIsComposing(false);
    if (res.error) {
      setComposeError(res.error);
    } else {
      setShowCompose(false);
      setComposeTo("");
      setComposeName("");
      setComposeSubject("");
      setComposeBody("");
      if (res.threadId) {
        setSelectedThreadId(res.threadId);
      }
      router.refresh();
    }
  };

  // Handle Simulation
  const handleSimulateInbound = async () => {
    setIsSimulating(true);
    const res = await simulateInboundReply({
      threadId: selectedThreadId || undefined,
      senderEmail: simEmail,
      senderName: simName,
      subject: simSubject,
      message: simMessage,
    });
    setIsSimulating(false);
    setShowSimulateModal(false);
    if (res.threadId) {
      setSelectedThreadId(res.threadId);
    }
    router.refresh();
  };

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || initialThreads.find((t) => t.id === selectedThreadId);
  const unreadCount = threads.filter((t) => t.unread_count > 0).length;

  return (
    <div className="space-y-4">
      {/* Native CRM Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6 text-accent-blue" />
            Mailbox & Conversations
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Direct two-way email communications and replies routed to{" "}
            <span className="font-mono text-accent-blue font-semibold">{senderEmail || "contacts@devunomieta.xyz"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => {
                if (selectedThread) {
                  setSimEmail(selectedThread.recipient_email);
                  setSimName(selectedThread.recipient_name || "");
                  setSimSubject(
                    selectedThread.subject.startsWith("Re:")
                      ? selectedThread.subject
                      : `Re: ${selectedThread.subject}`
                  );
                }
                setShowSimulateModal(true);
              }}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-header/20 hover:bg-header/40 text-foreground transition-all flex items-center gap-1.5"
              title="Test inbound reply parsing without waiting for an external email"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
              <span>Simulate Reply</span>
            </button>
          )}

          {canSend && (
            <button
              onClick={() => setShowCompose(true)}
              className={crmPrimaryBtnClass}
            >
              <PenSquare size={15} />
              <span>Compose Email</span>
            </button>
          )}
        </div>
      </div>

      <CrmPageGuide
        pageKey="mailbox"
        title="CRM Mailbox vs Campaigns"
        description="The Mailbox handles 1:1 direct conversations and incoming customer replies. Campaigns handle bulk marketing newsletters and broadcast outreach."
        tips={[
          "Any reply to a campaign or direct mail arrives here automatically via Cloudflare Email Routing.",
          "Conversations are automatically linked to existing Leads or Clients by email address.",
          "Replying to a thread maintains RFC headers (In-Reply-To), keeping the conversation grouped in the recipient's mail app.",
        ]}
      />

      {/* Top Filter & Search Bar */}
      <div className="bg-background border border-border rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Simple 2-Tab Selector */}
        <div className="flex items-center gap-1 bg-header/40 p-1 rounded-lg border border-border/50 self-start sm:self-auto">
          <button
            onClick={() => switchTab("inbox")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "inbox"
                ? "bg-accent-blue text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Inbox size={14} />
            <span>Inbox</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "inbox" ? "bg-white text-accent-blue" : "bg-accent-blue text-white"
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => switchTab("sent")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "sent"
                ? "bg-accent-blue text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Send size={14} />
            <span>Direct Sent</span>
          </button>
        </div>

        {/* Realtime Search */}
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, contact, or subject (realtime)..."
            className={`${crmInputClass} pl-9 pr-14 text-xs py-1.5`}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearching && (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-blue mr-1" />
            )}
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted hover:text-foreground text-xs p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </form>

        <button
          onClick={() => router.refresh()}
          className="p-2 border border-border rounded-lg text-muted hover:text-foreground hover:bg-header/40 transition-colors self-end sm:self-auto"
          title="Refresh messages"
        >
          <RefreshCw className={`w-4 h-4 ${isPending || isSearching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main Mailbox Content: Split View */}
      <div className="bg-background border border-border rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
        {/* Left Column: Thread List (5 cols) */}
        <div
          className={`${
            selectedThreadId ? "hidden md:block" : "block"
          } md:col-span-5 lg:col-span-4 border-r border-border overflow-y-auto max-h-[720px] divide-y divide-border/60`}
        >
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted">
              <MailOpen className="w-10 h-10 mb-2 stroke-1 opacity-40 text-muted" />
              <p className="text-sm font-semibold text-foreground">
                {search.trim() ? "No matching conversations" : "No conversations yet"}
              </p>
              <p className="text-xs text-muted mt-1 max-w-[220px]">
                {search.trim()
                  ? "Try a different search query."
                  : activeTab === "inbox"
                  ? "Replies and inbound customer emails will appear here automatically."
                  : "Direct 1:1 outbound emails sent from Mailbox will appear here."}
              </p>
            </div>
          ) : (
            threads.map((thread) => {
              const isSelected = thread.id === selectedThreadId;
              const isUnread = thread.unread_count > 0;

              return (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-accent-blue/10 border-l-4 border-l-accent-blue"
                      : isUnread
                      ? "bg-accent-blue/5 hover:bg-accent-blue/10 font-semibold"
                      : "hover:bg-header/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-xs truncate ${
                        isUnread ? "text-foreground font-bold" : "text-foreground/90 font-medium"
                      }`}
                    >
                      {thread.recipient_name || thread.recipient_email}
                    </span>
                    <span className="text-[10px] text-muted flex-shrink-0">
                      {new Date(thread.last_message_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <p
                    className={`text-xs truncate mb-1 ${
                      isUnread ? "text-foreground font-semibold" : "text-foreground/80"
                    }`}
                  >
                    {thread.subject}
                  </p>

                  <p className="text-[11px] text-muted line-clamp-1">
                    {thread.last_message_preview || "No message preview"}
                  </p>

                  {/* Association tags */}
                  {(thread.client || thread.lead) && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {thread.client && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-medium">
                          Client: {thread.client.name}
                        </span>
                      )}
                      {thread.lead && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded font-medium">
                          Lead: {thread.lead.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Active Thread & Reply Pane (7 cols) */}
        <div
          className={`${
            selectedThreadId ? "flex" : "hidden md:flex"
          } md:col-span-7 lg:col-span-8 flex-col bg-background min-h-[560px] max-h-[720px] overflow-hidden`}
        >
          {selectedThread ? (
            <div className="flex flex-col h-full">
              {/* Thread Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-header/20 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedThreadId(null)}
                    className="md:hidden p-1.5 text-muted hover:text-foreground hover:bg-header/40 rounded-lg mr-1"
                    title="Back to list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div>
                    <h2 className="text-sm font-bold text-foreground truncate max-w-sm lg:max-w-md">
                      {selectedThread.subject}
                    </h2>
                    <p className="text-[11px] text-muted">
                      With: <span className="text-foreground/90 font-medium">{selectedThread.recipient_name || selectedThread.recipient_email}</span> ({selectedThread.recipient_email})
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Timeline */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center p-12 text-muted">
                    <RefreshCw className="w-6 h-6 animate-spin text-accent-blue" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-muted text-xs">No messages found in this conversation.</div>
                ) : (
                  messages.map((msg) => {
                    const isOutbound = msg.direction === "outbound";
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-xl border p-4 shadow-sm ${
                          isOutbound
                            ? "bg-header/30 border-border ml-3 sm:ml-8"
                            : "bg-background border-border/80 mr-3 sm:mr-8"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                isOutbound
                                  ? "bg-accent-blue text-white"
                                  : "bg-header text-foreground border border-border"
                              }`}
                            >
                              {(msg.from_name || msg.from_email || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {msg.from_name || msg.from_email}
                                </span>
                                {isOutbound && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-accent-blue/15 text-accent-blue rounded font-semibold">
                                    You
                                  </span>
                                )}
                                {msg.security_status === "suspicious" && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-red-400/15 text-red-400 border border-red-400/20 rounded font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Suspicious Content
                                  </span>
                                )}
                                {msg.security_status === "unverified" && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-yellow-400/15 text-yellow-400 border border-yellow-400/20 rounded font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Unverified Sender
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted">{msg.from_email}</span>
                            </div>
                          </div>

                          <div className="text-[11px] text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(msg.sent_at).toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Security warnings */}
                        {msg.security_status === "suspicious" && (
                          <div className="mb-3 p-2 bg-red-400/10 border border-red-400/20 text-red-300 text-xs rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>Warning: This email was flagged by the security filter. Do not execute attachments.</span>
                          </div>
                        )}
                        {msg.security_status === "unverified" && (
                          <div className="mb-3 p-2 bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-xs rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>Caution: SPF or DKIM sender verification failed for this email. Sender might be spoofed.</span>
                          </div>
                        )}

                        {/* Message Content */}
                        <div className="text-xs text-foreground/90 leading-relaxed font-normal break-words overflow-x-auto">
                          {msg.body_html ? (
                            <div
                              className="prose prose-invert max-w-none text-xs text-foreground/90 leading-relaxed [&_a]:text-accent-blue [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2.5 [&_blockquote]:border-l-2 [&_blockquote]:border-accent-blue [&_blockquote]:pl-3 [&_blockquote]:text-muted"
                              dangerouslySetInnerHTML={{ __html: msg.body_html }}
                            />
                          ) : msg.body_text ? (
                            <div className="prose prose-invert max-w-none text-xs text-foreground/90 leading-relaxed [&_a]:text-accent-blue [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2.5 [&_blockquote]:border-l-2 [&_blockquote]:border-accent-blue [&_blockquote]:pl-3 [&_blockquote]:text-muted">
                              <ReactMarkdown
                                components={{
                                  a: ({ ...props }) => <a target="_blank" rel="noopener noreferrer" className="text-accent-blue underline hover:text-accent-blue/80" {...props} />,
                                  p: ({ ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                                  ul: ({ ...props }) => <ul className="list-disc pl-5 mb-2 space-y-0.5" {...props} />,
                                  ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5" {...props} />,
                                  strong: ({ ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                                  code: ({ ...props }) => <code className="bg-header/60 px-1 py-0.5 rounded text-[11px] font-mono text-accent-blue" {...props} />,
                                }}
                              >
                                {msg.body_text}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <span className="text-muted italic">(Empty message body)</span>
                          )}
                        </div>

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                            {msg.attachments.map((att, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-header/40 border border-border rounded-lg text-foreground/80"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-muted" />
                                <span>{att.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Box Footer */}
              {canSend && (
                <div className="p-3 border-t border-border bg-header/10 flex-shrink-0">
                  {replyError && (
                    <div className="mb-2 p-2 text-xs bg-red-400/10 border border-red-400/30 text-red-400 rounded-lg flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{replyError}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <MailboxRichEditor
                      value={replyText}
                      onChange={setReplyText}
                      placeholder={`Reply directly to ${
                        selectedThread.recipient_name || selectedThread.recipient_email
                      }...`}
                      minHeight="100px"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted">
                        Sending as: <strong className="text-foreground">{senderEmail || "Portfolio Admin"}</strong>
                      </span>

                      <button
                        onClick={handleSendReply}
                        disabled={isSendingReply || (!stripHtmlToText(replyText) && !replyText.includes("<img"))}
                        className={crmPrimaryBtnClass}
                      >
                        {isSendingReply ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <CornerUpLeft className="w-3.5 h-3.5" />
                            <span>Send Reply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted p-8 my-auto">
              <Mail className="w-12 h-12 mb-3 stroke-1 opacity-30 text-muted" />
              <p className="text-sm font-semibold text-foreground">Select a conversation</p>
              <p className="text-xs text-muted mt-1 max-w-sm">
                Choose a conversation on the left to read customer replies, inspect message history, and send responses.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      <CrmModal
        open={showCompose}
        onClose={() => setShowCompose(false)}
        title="Compose Direct Email"
      >
        <form onSubmit={handleSendCompose} className="space-y-3">
          {composeError && (
            <div className="p-2 text-xs bg-red-400/10 border border-red-400/30 text-red-400 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{composeError}</span>
            </div>
          )}

          <div>
            <label className={crmLabelClass}>To Email *</label>
            <input
              type="email"
              required
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              placeholder="client@company.com"
              className={crmInputClass}
            />
          </div>

          <div>
            <label className={crmLabelClass}>Recipient Name (Optional)</label>
            <input
              type="text"
              value={composeName}
              onChange={(e) => setComposeName(e.target.value)}
              placeholder="e.g. John Doe"
              className={crmInputClass}
            />
          </div>

          <div>
            <label className={crmLabelClass}>Subject *</label>
            <input
              type="text"
              required
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              placeholder="e.g. Quotation details for your project"
              className={crmInputClass}
            />
          </div>

          <div>
            <label className={crmLabelClass}>Message *</label>
            <MailboxRichEditor
              value={composeBody}
              onChange={setComposeBody}
              placeholder="Write your email here..."
              minHeight="180px"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setShowCompose(false)}
              className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button type="submit" disabled={isComposing} className={crmPrimaryBtnClass}>
              {isComposing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        </form>
      </CrmModal>

      {/* Test Inbound Reply Simulator Modal */}
      <CrmModal
        open={showSimulateModal}
        onClose={() => setShowSimulateModal(false)}
        title="Simulate Inbound Email Reply"
      >
        <div className="space-y-3">
          <p className="text-xs text-muted">
            This tests incoming email ingestion through the webhook parser. It verifies that replies group into the same conversation thread and display immediately in your Inbox.
          </p>

          <div>
            <label className={crmLabelClass}>Sender Email</label>
            <input
              type="email"
              value={simEmail}
              onChange={(e) => setSimEmail(e.target.value)}
              className={crmInputClass}
            />
          </div>

          <div>
            <label className={crmLabelClass}>Sender Name</label>
            <input
              type="text"
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              className={crmInputClass}
            />
          </div>

          <div>
            <label className={crmLabelClass}>Subject</label>
            <input
              type="text"
              value={simSubject}
              onChange={(e) => setSimSubject(e.target.value)}
              className={crmInputClass}
            />
          </div>

          <div>
            <label className={crmLabelClass}>Reply Content</label>
            <textarea
              rows={3}
              value={simMessage}
              onChange={(e) => setSimMessage(e.target.value)}
              className={`${crmInputClass} resize-none`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setShowSimulateModal(false)}
              className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSimulateInbound}
              disabled={isSimulating}
              className={crmPrimaryBtnClass}
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingesting...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Ingest Reply</span>
                </>
              )}
            </button>
          </div>
        </div>
      </CrmModal>
    </div>
  );
}
