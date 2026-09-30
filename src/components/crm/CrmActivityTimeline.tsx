"use client";

import { useState } from "react";
import {
  Mail,
  MessageCircle,
  StickyNote,
  ChevronDown,
  ChevronUp,
  CornerUpLeft,
  Loader2,
  Send,
  History,
  GitCommit,
} from "lucide-react";
import type { CrmThread, CrmMessage, CrmInternalNote, CrmStageEvent } from "@/lib/crm/types";
import { replyToThread, getThreadMessages } from "@/app/crm/mailbox/actions";
import { useCrmFeedback } from "./CrmFeedbackProvider";
import { TablePagination } from "./TablePagination";

export function CrmActivityTimeline({
  threads,
  internalNotes,
  whatsAppEvents = [],
  stageEvents = [],
  onRefresh,
}: {
  threads: CrmThread[];
  internalNotes: CrmInternalNote[];
  whatsAppEvents?: Array<{
    id: string;
    phone: string;
    message: string | null;
    status: string;
    direction: string;
    created_at: string;
  }>;
  stageEvents?: CrmStageEvent[];
  onRefresh?: () => void;
}) {
  const { toast } = useCrmFeedback();
  const [activeSection, setActiveSection] = useState<"comms" | "stages">("comms");
  const [filter, setFilter] = useState<"all" | "emails" | "whatsapp" | "notes">("all");
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Record<string, CrmMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null);

  // Pagination states (20 items per page)
  const [commsPage, setCommsPage] = useState(1);
  const [stagePage, setStagePage] = useState(1);
  const PAGE_SIZE = 20;

  // Quick reply box state per thread
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Toggle thread expansion
  const toggleThread = async (threadId: string) => {
    if (expandedThreadId === threadId) {
      setExpandedThreadId(null);
      return;
    }

    setExpandedThreadId(threadId);

    // Fetch messages if not already in cache
    if (!threadMessages[threadId]) {
      setLoadingMessages(threadId);
      try {
        const msgs = await getThreadMessages(threadId);
        setThreadMessages((prev) => ({ ...prev, [threadId]: msgs }));
      } catch (err) {
        console.error("Failed to load thread messages:", err);
      } finally {
        setLoadingMessages(null);
      }
    }
  };

  // Submit quick reply directly inside thread
  const handleReply = async (threadId: string) => {
    if (!replyText.trim()) return;

    setSendingReply(true);
    const html = `<p>${replyText.replace(/\n/g, "<br/>")}</p>`;
    const res = await replyToThread({
      threadId,
      messageHtml: html,
      messageText: replyText,
    });
    setSendingReply(false);

    if ("success" in res && res.success) {
      toast("Reply sent!");
      setReplyText("");
      const msgs = await getThreadMessages(threadId);
      setThreadMessages((prev) => ({ ...prev, [threadId]: msgs }));
      onRefresh?.();
    } else {
      toast("error" in res && res.error ? res.error : "Failed to send reply");
    }
  };

  // Combine comms items into a single feed sorted chronologically descending
  type FeedItem =
    | { type: "thread"; date: string; data: CrmThread }
    | { type: "note"; date: string; data: CrmInternalNote }
    | {
        type: "whatsapp";
        date: string;
        data: {
          id: string;
          phone: string;
          message: string | null;
          status: string;
          direction: string;
          created_at: string;
        };
      };

  const allFeedItems: FeedItem[] = [];

  if (filter === "all" || filter === "emails") {
    threads.forEach((t) => {
      allFeedItems.push({ type: "thread", date: t.last_message_at, data: t });
    });
  }

  if (filter === "all" || filter === "notes") {
    internalNotes.forEach((n) => {
      allFeedItems.push({ type: "note", date: n.created_at, data: n });
    });
  }

  if (filter === "all" || filter === "whatsapp") {
    whatsAppEvents.forEach((w) => {
      allFeedItems.push({ type: "whatsapp", date: w.created_at, data: w });
    });
  }

  allFeedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalCommsCount = threads.length + internalNotes.length + whatsAppEvents.length;

  // Pagination slicing for Comms
  const totalCommsPages = Math.ceil(allFeedItems.length / PAGE_SIZE) || 1;
  const paginatedFeedItems = allFeedItems.slice(
    (commsPage - 1) * PAGE_SIZE,
    commsPage * PAGE_SIZE
  );

  // Pagination slicing for Stages
  const totalStagePages = Math.ceil(stageEvents.length / PAGE_SIZE) || 1;
  const paginatedStageEvents = stageEvents.slice(
    (stagePage - 1) * PAGE_SIZE,
    stagePage * PAGE_SIZE
  );

  return (
    <div className="bg-header/20 border border-border rounded-xl shadow-sm overflow-hidden w-full">
      {/* Top Header: Section Switcher & Channel Filters */}
      <div className="p-4 sm:p-5 border-b border-border/60 bg-header/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Tabs: Communication Activity vs. Journey Stage Transitions */}
          <div className="flex items-center gap-1.5 p-1 bg-header/40 border border-border/60 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveSection("comms");
                setCommsPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                activeSection === "comms"
                  ? "bg-accent-blue text-white shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-header/50"
              }`}
            >
              <History size={13} />
              <span>Communication History</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeSection === "comms" ? "bg-white/20 text-white" : "bg-border/60 text-muted"
                }`}
              >
                {totalCommsCount}
              </span>
            </button>

            {stageEvents.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveSection("stages");
                  setStagePage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                  activeSection === "stages"
                    ? "bg-accent-blue text-white shadow-sm"
                    : "text-muted hover:text-foreground hover:bg-header/50"
                }`}
              >
                <GitCommit size={13} />
                <span>Stage Transitions</span>
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeSection === "stages" ? "bg-white/20 text-white" : "bg-border/60 text-muted"
                  }`}
                >
                  {stageEvents.length}
                </span>
              </button>
            )}
          </div>

          {/* Sub-filters for Communication Activity */}
          {activeSection === "comms" && (
            <div className="flex items-center flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setCommsPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all text-xs ${
                  filter === "all"
                    ? "bg-accent-blue/15 border-accent-blue text-accent-blue font-medium"
                    : "border-border/60 text-muted hover:text-foreground hover:bg-header/40"
                }`}
              >
                All ({totalCommsCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilter("emails");
                  setCommsPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all text-xs flex items-center gap-1 ${
                  filter === "emails"
                    ? "bg-accent-blue/15 border-accent-blue text-accent-blue font-medium"
                    : "border-border/60 text-muted hover:text-foreground hover:bg-header/40"
                }`}
              >
                <Mail size={12} />
                Emails ({threads.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilter("whatsapp");
                  setCommsPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all text-xs flex items-center gap-1 ${
                  filter === "whatsapp"
                    ? "bg-accent-green/15 border-accent-green text-accent-green font-medium"
                    : "border-border/60 text-muted hover:text-foreground hover:bg-header/40"
                }`}
              >
                <MessageCircle size={12} />
                WhatsApp ({whatsAppEvents.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilter("notes");
                  setCommsPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all text-xs flex items-center gap-1 ${
                  filter === "notes"
                    ? "bg-amber-500/15 border-amber-500 text-amber-300 font-medium"
                    : "border-border/60 text-muted hover:text-foreground hover:bg-header/40"
                }`}
              >
                <StickyNote size={12} />
                Notes ({internalNotes.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Area with smooth layout and pagination */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Tab 1: Communication Feed */}
        {activeSection === "comms" && (
          <>
            {paginatedFeedItems.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted">
                No communication records found for this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedFeedItems.map((item) => {
                  // Email Thread
                  if (item.type === "thread") {
                    const thread = item.data;
                    const isExpanded = expandedThreadId === thread.id;
                    const messages = threadMessages[thread.id] || [];
                    const isLoading = loadingMessages === thread.id;

                    return (
                      <div
                        key={`thread-${thread.id}`}
                        className="border border-border/80 rounded-xl overflow-hidden bg-background/50 hover:border-accent-blue/40 transition-colors shadow-xs"
                      >
                        {/* Thread Summary Bar */}
                        <div
                          onClick={() => toggleThread(thread.id)}
                          className="p-3.5 sm:p-4 flex items-start justify-between gap-3 cursor-pointer bg-header/20 hover:bg-header/40 transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue mt-0.5 flex-shrink-0">
                              <Mail size={15} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-bold text-foreground truncate">{thread.subject}</span>
                                {thread.contact && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                    Contact: {thread.contact.name} {thread.contact.role ? `(${thread.contact.role})` : ""}
                                  </span>
                                )}
                                {thread.unread_count > 0 && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-accent-blue text-white font-bold">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted line-clamp-1">
                                <span className="text-foreground/80 font-medium">
                                  {thread.recipient_name || thread.recipient_email}:
                                </span>{" "}
                                {thread.last_message_preview || "No preview"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] text-muted whitespace-nowrap">
                              {new Date(thread.last_message_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={15} className="text-muted" />
                            ) : (
                              <ChevronDown size={15} className="text-muted" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Message Transcript */}
                        {isExpanded && (
                          <div className="p-4 border-t border-border/60 bg-header/10 space-y-4">
                            {isLoading ? (
                              <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted">
                                <Loader2 size={15} className="animate-spin text-accent-blue" />
                                Loading conversation transcript...
                              </div>
                            ) : (
                              <>
                                <div className="space-y-3">
                                  {messages.map((m) => {
                                    const isOutbound = m.direction === "outbound";
                                    return (
                                      <div
                                        key={m.id}
                                        className={`p-3.5 rounded-xl border text-xs ${
                                          isOutbound
                                            ? "bg-accent-blue/10 border-accent-blue/20 ml-4 sm:ml-12"
                                            : "bg-header/40 border-border/80 mr-4 sm:mr-12"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-border/40">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-foreground">
                                              {isOutbound
                                                ? m.from_name || "You / Team"
                                                : m.from_name || m.from_email}
                                            </span>
                                            <span className="text-[10px] text-muted">({m.from_email})</span>
                                          </div>
                                          <span className="text-[10px] text-muted">
                                            {new Date(m.sent_at).toLocaleDateString([], {
                                              month: "short",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        </div>
                                        <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                          {m.body_text || "No text content"}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Quick Reply Form inside thread */}
                                <div className="mt-4 pt-3 border-t border-border/60">
                                  <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted">
                                    <CornerUpLeft size={13} />
                                    <span>Quick Reply to Thread</span>
                                  </div>
                                  <textarea
                                    rows={3}
                                    placeholder="Type your reply here..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="w-full bg-header/40 border border-border rounded-lg p-2.5 text-xs text-foreground focus:border-accent-blue outline-none resize-y"
                                  />
                                  <div className="flex justify-end mt-2">
                                    <button
                                      type="button"
                                      disabled={sendingReply || !replyText.trim()}
                                      onClick={() => handleReply(thread.id)}
                                      className="px-3.5 py-1.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all text-xs flex items-center gap-1.5 disabled:opacity-50 font-medium"
                                    >
                                      {sendingReply ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                      Send Reply
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // WhatsApp Event
                  if (item.type === "whatsapp") {
                    const wa = item.data;
                    const isOutbound = wa.direction === "outbound";

                    return (
                      <div
                        key={`wa-${wa.id}`}
                        className="border border-accent-green/20 rounded-xl p-3.5 sm:p-4 bg-accent-green/5 flex items-start gap-3 shadow-xs"
                      >
                        <div className="p-2 rounded-lg bg-accent-green/20 text-accent-green mt-0.5 flex-shrink-0">
                          <MessageCircle size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-foreground">
                              WhatsApp {isOutbound ? "Sent to" : "Received from"} {wa.phone}
                            </span>
                            <span className="text-[10px] text-muted">
                              {new Date(wa.created_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap">{wa.message}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-accent-green/20 text-accent-green uppercase">
                              {wa.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Internal Note
                  if (item.type === "note") {
                    const note = item.data;
                    return (
                      <div
                        key={`note-${note.id}`}
                        className="border border-amber-500/30 rounded-xl p-3.5 sm:p-4 bg-amber-500/5 flex items-start gap-3 shadow-xs"
                      >
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 mt-0.5 flex-shrink-0">
                          <StickyNote size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-amber-300">{note.author_name}</span>
                              <span className="text-[10px] text-muted">({note.author_email})</span>
                            </div>
                            <span className="text-[10px] text-muted">
                              {new Date(note.created_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}

            {/* Pagination for Comms */}
            {allFeedItems.length > PAGE_SIZE && (
              <div className="mt-4 pt-2">
                <TablePagination
                  currentPage={commsPage}
                  totalPages={totalCommsPages}
                  totalItems={allFeedItems.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(p) => setCommsPage(p)}
                />
              </div>
            )}
          </>
        )}

        {/* Tab 2: Journey Stage Transitions */}
        {activeSection === "stages" && (
          <div className="p-1 sm:p-2">
            {stageEvents.length === 0 ? (
              <p className="text-xs text-muted py-8 text-center">No journey transitions recorded yet.</p>
            ) : (
              <>
                <div className="relative pl-6 border-l-2 border-border/80 space-y-4 my-2">
                  {paginatedStageEvents.map((ev, idx) => (
                    <div key={ev.id} className="relative group">
                      <div
                        className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-background ${
                          idx === 0 && stagePage === 1
                            ? "bg-accent-blue ring-4 ring-accent-blue/20"
                            : "bg-muted/60"
                        }`}
                      />
                      <div className="bg-header/20 border border-border/60 rounded-xl p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                            {ev.stage_key}
                          </span>
                          <span className="text-[11px] text-muted font-medium">
                            {new Date(ev.entered_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {ev.note && <p className="text-xs text-muted mt-1 leading-relaxed">{ev.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination for Stages */}
                {stageEvents.length > PAGE_SIZE && (
                  <div className="mt-4 pt-2">
                    <TablePagination
                      currentPage={stagePage}
                      totalPages={totalStagePages}
                      totalItems={stageEvents.length}
                      pageSize={PAGE_SIZE}
                      onPageChange={(p) => setStagePage(p)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
