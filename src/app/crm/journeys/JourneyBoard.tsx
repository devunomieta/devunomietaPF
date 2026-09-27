"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Loader2,
  Search,
  Filter,
  Plus,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  ArrowUpDown,
  Building2,
  Mail,
  Phone,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronsRight,
  User,
  X
} from "lucide-react";
import type { CrmLead, CrmJourneyStage } from "@/lib/crm/types";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { CrmModal, crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { moveLeadStage, saveLead } from "../leads/actions";

interface JourneyBoardProps {
  pipelineName: string;
  stages: CrmJourneyStage[];
  leads: CrmLead[];
}

type SortOption = "newest" | "oldest" | "score-desc" | "name-asc";
type ViewMode = "kanban" | "list";

// Stage color accents for visual distinction
const STAGE_THEMES: Record<string, { badge: string; border: string; dot: string; indicator: string }> = {
  lead: {
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
    indicator: "from-blue-500/20 to-transparent",
  },
  contacted: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
    indicator: "from-amber-500/20 to-transparent",
  },
  qualified: {
    badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    border: "border-indigo-500/30",
    dot: "bg-indigo-400",
    indicator: "from-indigo-500/20 to-transparent",
  },
  proposal: {
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    border: "border-purple-500/30",
    dot: "bg-purple-400",
    indicator: "from-purple-500/20 to-transparent",
  },
  won: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
    indicator: "from-emerald-500/20 to-transparent",
  },
  lost: {
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    border: "border-rose-500/30",
    dot: "bg-rose-400",
    indicator: "from-rose-500/20 to-transparent",
  },
};

export function JourneyBoard({ pipelineName, stages, leads: initialLeads }: JourneyBoardProps) {
  const router = useRouter();
  const { toast } = useCrmFeedback();

  // Local state for optimistic/seamless actions
  const [leads, setLeads] = useState<CrmLead[]>(initialLeads);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [targetStageKey, setTargetStageKey] = useState<string | null>(null);

  // Controls & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});
  const [activeStageFilter, setActiveStageFilter] = useState<string>("all");

  // Quick add modal state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDefaultStage, setQuickAddDefaultStage] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag-and-drop state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStageKey, setDragOverStageKey] = useState<string | null>(null);

  // Quick Lead Drawer / Preview state
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);

  // Tag filter dropdown menu state
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [tagFilterQuery, setTagFilterQuery] = useState("");
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setTagMenuOpen(false);
      }
    }
    if (tagMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [tagMenuOpen]);

  // Categorize stages
  const openStages = useMemo(() => stages.filter((s) => !s.is_won && !s.is_lost), [stages]);
  const terminalStages = useMemo(() => stages.filter((s) => s.is_won || s.is_lost), [stages]);
  const allColumns = useMemo(() => [...openStages, ...terminalStages], [openStages, terminalStages]);

  // Extract all distinct tags across all leads for fast filter pills
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      l.tags?.forEach((t) => {
        if (t.trim()) set.add(t.trim());
      });
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered tags for the dropdown search
  const filteredDropdownTags = useMemo(() => {
    if (!tagFilterQuery.trim()) return availableTags;
    const q = tagFilterQuery.toLowerCase().trim();
    return availableTags.filter((t) => t.toLowerCase().includes(q));
  }, [availableTags, tagFilterQuery]);

  // Total metrics
  const totalLeadsCount = leads.length;
  const wonCount = useMemo(() => leads.filter((l) => l.status === "won").length, [leads]);
  const lostCount = useMemo(() => leads.filter((l) => l.status === "lost").length, [leads]);
  const activeCount = totalLeadsCount - wonCount - lostCount;

  // Filter & sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Tag filter
    if (selectedTag !== "all") {
      result = result.filter((l) => l.tags?.includes(selectedTag));
    }

    // Stage pill filter (especially helpful when focusing on specific stages on mobile/large data)
    if (activeStageFilter !== "all") {
      result = result.filter((l) => l.current_stage_key === activeStageFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "score-desc") {
        return (b.score || 0) - (a.score || 0);
      }
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [leads, searchQuery, selectedTag, activeStageFilter, sortBy]);

  // Group leads by stage key
  const leadsByStage = useMemo(() => {
    const map = new Map<string, CrmLead[]>();
    allColumns.forEach((col) => map.set(col.key, []));

    filteredAndSortedLeads.forEach((lead) => {
      // Default fallback to first stage if unassigned or orphaned
      const stageKey = lead.current_stage_key || openStages[0]?.key || "lead";
      const existing = map.get(stageKey);
      if (existing) {
        existing.push(lead);
      } else {
        // If lead has a stage not in the current list, append to first column or create ad-hoc
        const fallback = map.get(openStages[0]?.key) || [];
        fallback.push(lead);
      }
    });

    return map;
  }, [filteredAndSortedLeads, allColumns, openStages]);

  function getNextStage(current: string): CrmJourneyStage | null {
    const idx = openStages.findIndex((s) => s.key === current);
    if (idx === -1) return null;
    if (idx === openStages.length - 1) {
      // Last open stage -> offer Won stage as default advancement if available
      return terminalStages.find((s) => s.is_won) || null;
    }
    return openStages[idx + 1];
  }

  function getPrevStage(current: string): CrmJourneyStage | null {
    const idx = openStages.findIndex((s) => s.key === current);
    if (idx <= 0) return null;
    return openStages[idx - 1];
  }

  // Handle stage transition
  async function handleAdvance(leadId: string, stageKey: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setMovingId(leadId);
    setTargetStageKey(stageKey);

    // Optimistically update UI
    const targetStage = allColumns.find((s) => s.key === stageKey);
    const prevLeads = [...leads];
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              current_stage_key: stageKey,
              status: targetStage?.is_won ? "won" : targetStage?.is_lost ? "lost" : "open",
            }
          : l
      )
    );

    const result = await moveLeadStage(leadId, stageKey);
    setMovingId(null);
    setTargetStageKey(null);

    if ("success" in result) {
      if (result.clientId) {
        toast("Lead converted to client successfully!");
        router.push(`/crm/clients/${result.clientId}`);
      } else {
        router.refresh();
      }
    } else {
      // Revert optimistic update
      setLeads(prevLeads);
      toast(result.error);
    }
  }

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, leadId: string) {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedLeadId(leadId);
  }

  function handleDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStageKey !== stageKey) {
      setDragOverStageKey(stageKey);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(e: React.DragEvent, targetStageKey: string) {
    e.preventDefault();
    setDragOverStageKey(null);
    const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId;
    setDraggedLeadId(null);

    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.current_stage_key === targetStageKey) return;

    await handleAdvance(leadId, targetStageKey);
  }

  // Toggle stage collapse
  function toggleCollapse(stageKey: string) {
    setCollapsedStages((prev) => ({
      ...prev,
      [stageKey]: !prev[stageKey],
    }));
  }

  // Quick add lead
  async function handleQuickAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await saveLead(formData);
    setIsSubmitting(false);

    if ("success" in result) {
      setQuickAddOpen(false);
      toast("Lead created successfully");
      router.refresh();
    } else {
      toast(result.error);
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top Header & High-level Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-header/20 border border-border/80 p-4 rounded-2xl backdrop-blur-sm shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              {pipelineName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-blue/15 text-accent-blue border border-accent-blue/20">
              {leads.length} total leads
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Drag cards between columns or use quick stage advance to drive pipeline progression.
          </p>
        </div>

        {/* Action Bar & High-level summary badges */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-2 bg-background/60 border border-border px-3 h-9 rounded-xl text-xs text-muted whitespace-nowrap">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              {activeCount} Active
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5 font-medium text-accent-green">
              <CheckCircle2 size={13} />
              {wonCount} Won
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5 font-medium text-rose-400">
              <XCircle size={13} />
              {lostCount} Lost
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-header/60 border border-border rounded-xl p-0.5 h-9 shrink-0">
            <button
              onClick={() => setViewMode("kanban")}
              title="Kanban Board View"
              className={`px-2.5 h-full rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "kanban"
                  ? "bg-accent-blue text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid size={14} />
              <span className="hidden md:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Compact Grouped List View"
              className={`px-2.5 h-full rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-accent-blue text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <List size={14} />
              <span className="hidden md:inline">List</span>
            </button>
          </div>

          {/* Quick Add Button */}
          <button
            onClick={() => {
              setQuickAddDefaultStage(openStages[0]?.key);
              setQuickAddOpen(true);
            }}
            className="px-3.5 h-9 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl transition-all text-xs font-medium flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
          >
            <Plus size={15} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & Sorting Control Strip */}
      <div className="flex flex-col gap-3 bg-header/20 border border-border/70 p-3 rounded-2xl shadow-xs">
        {/* Top Row: Search Input + Tag Filter + Sort Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by name, company, email, tag..."
              className="w-full bg-background/80 border border-border rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted/70 focus:border-accent-blue outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5 rounded-full hover:bg-header"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right side: Tag Filter & Sort Controls aligned together */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {/* Custom Searchable & Scrollable Tag Selector */}
            {availableTags.length > 0 && (
              <div className="relative" ref={tagDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setTagMenuOpen(!tagMenuOpen);
                    setTagFilterQuery("");
                  }}
                  className={`flex items-center gap-1.5 bg-background/80 border ${
                    tagMenuOpen ? "border-accent-blue ring-1 ring-accent-blue/30" : "border-border"
                  } rounded-xl px-2.5 py-1.5 h-9 text-xs text-foreground hover:bg-header/50 transition-all cursor-pointer`}
                >
                  <Tag size={13} className="text-muted shrink-0" />
                  <span className="font-medium max-w-[130px] truncate">
                    {selectedTag === "all" ? "All Tags" : `#${selectedTag}`}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-muted shrink-0 transition-transform ${tagMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Menu Popover */}
                {tagMenuOpen && (
                  <div className="absolute right-0 sm:left-0 sm:right-auto mt-1.5 w-64 bg-header border border-border rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                    {/* Search box inside tag dropdown */}
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        value={tagFilterQuery}
                        onChange={(e) => setTagFilterQuery(e.target.value)}
                        placeholder="Search tags..."
                        autoFocus
                        className="w-full bg-background/80 border border-border rounded-lg pl-7 pr-6 py-1 text-xs text-foreground placeholder:text-muted focus:border-accent-blue outline-none"
                      />
                      {tagFilterQuery && (
                        <button
                          type="button"
                          onClick={() => setTagFilterQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Scrollable list of tags */}
                    <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 scrollbar-thin pt-1">
                      {/* All Tags Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTag("all");
                          setTagMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                          selectedTag === "all"
                            ? "bg-accent-blue text-white"
                            : "text-foreground hover:bg-background/80"
                        }`}
                      >
                        <span>All Tags</span>
                        <span className="text-[10px] opacity-75">{leads.length}</span>
                      </button>

                      {filteredDropdownTags.map((tag) => {
                        const count = leads.filter((l) => l.tags?.includes(tag)).length;
                        const isSelected = selectedTag === tag;
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setSelectedTag(tag);
                              setTagMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between group ${
                              isSelected
                                ? "bg-accent-blue text-white"
                                : "text-foreground hover:bg-background/80"
                            }`}
                          >
                            <span className="truncate pr-2">#{tag}</span>
                            <span
                              className={`text-[10px] opacity-75 px-1 rounded ${
                                isSelected ? "bg-white/20 text-white" : "text-muted group-hover:text-foreground"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}

                      {filteredDropdownTags.length === 0 && (
                        <p className="text-[11px] text-muted text-center py-3">No matching tags found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-background/80 border border-border rounded-xl px-2.5 py-1.5 h-9">
              <ArrowUpDown size={13} className="text-muted shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent border-0 text-xs text-foreground focus:outline-none cursor-pointer font-medium pr-1"
              >
                <option value="newest" className="bg-header text-foreground">Newest First</option>
                <option value="oldest" className="bg-header text-foreground">Oldest First</option>
                <option value="score-desc" className="bg-header text-foreground">Highest Score</option>
                <option value="name-asc" className="bg-header text-foreground">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Row: Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 border-t border-border/40 scrollbar-none">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted mr-1 shrink-0">
            Filter:
          </span>
          <button
            onClick={() => setActiveStageFilter("all")}
            className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition-all border ${
              activeStageFilter === "all"
                ? "bg-foreground text-background border-foreground font-semibold shadow-xs"
                : "bg-background/50 border-border text-muted hover:text-foreground hover:bg-background"
            }`}
          >
            All Stages
          </button>
          {allColumns.map((st) => {
            const count = leads.filter((l) => l.current_stage_key === st.key).length;
            const isActive = activeStageFilter === st.key;
            return (
              <button
                key={st.key}
                onClick={() => setActiveStageFilter(isActive ? "all" : st.key)}
                className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition-all border flex items-center gap-1.5 ${
                  isActive
                    ? "bg-accent-blue/15 text-accent-blue border-accent-blue/40 font-semibold shadow-xs"
                    : "bg-background/50 border-border text-muted hover:text-foreground hover:bg-background"
                }`}
              >
                <span>{st.label}</span>
                <span className="text-[10px] opacity-75 font-mono px-1 py-0.2 rounded-full bg-header/60">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "kanban" ? (
        /* KANBAN BOARD VIEW */
        <div className="flex-1 min-h-[500px] overflow-x-auto overflow-y-hidden pb-3">
          <div className="flex gap-3 h-full items-stretch min-w-max px-0.5">
            {allColumns.map((stage) => {
              const stageLeads = leadsByStage.get(stage.key) || [];
              const isCollapsed = collapsedStages[stage.key];
              const isDragOver = dragOverStageKey === stage.key;
              const theme =
                STAGE_THEMES[stage.key] ||
                (stage.is_won
                  ? STAGE_THEMES.won
                  : stage.is_lost
                  ? STAGE_THEMES.lost
                  : STAGE_THEMES.lead);

              if (isCollapsed) {
                return (
                  <div
                    key={stage.key}
                    onClick={() => toggleCollapse(stage.key)}
                    onDragOver={(e) => handleDragOver(e, stage.key)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage.key)}
                    className={`w-14 shrink-0 h-full min-h-[460px] bg-header/30 hover:bg-header/50 border ${
                      isDragOver
                        ? "border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue/30"
                        : "border-border/80"
                    } rounded-2xl py-3 px-1 flex flex-col items-center justify-between cursor-pointer transition-all duration-200 select-none group shadow-xs hover:border-accent-blue/40`}
                    title={`Click to expand ${stage.label} (${stageLeads.length} leads)`}
                  >
                    {/* Top: Dot indicator + Lead count badge */}
                    <div className="flex flex-col items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full border ${theme.badge}`}>
                        {stageLeads.length}
                      </span>
                    </div>

                    {/* Middle: Vertical text without messy 3D transforms */}
                    <div className="flex-1 flex items-center justify-center my-4 overflow-hidden">
                      <span
                        className="text-xs font-bold text-muted group-hover:text-foreground tracking-wider uppercase whitespace-nowrap transition-colors"
                        style={{
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                        }}
                      >
                        {stage.label}
                      </span>
                    </div>

                    {/* Bottom: Expand icon & hover cue */}
                    <div className="flex flex-col items-center gap-1 text-muted group-hover:text-accent-blue transition-colors">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={stage.key}
                  onDragOver={(e) => handleDragOver(e, stage.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.key)}
                  className={`w-72 sm:w-80 flex flex-col h-full bg-header/20 border transition-all duration-200 rounded-2xl ${
                    isDragOver
                      ? "border-accent-blue bg-accent-blue/5 ring-2 ring-accent-blue/30"
                      : "border-border/70"
                  }`}
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-border/50 flex items-center justify-between shrink-0 bg-header/40 rounded-t-2xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${theme.dot}`} />
                      <h2 className="text-xs font-bold text-foreground truncate tracking-wide uppercase">
                        {stage.label}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${theme.badge}`}>
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setQuickAddDefaultStage(stage.key);
                          setQuickAddOpen(true);
                        }}
                        title={`Add lead directly to ${stage.label}`}
                        className="p-1 text-muted hover:text-foreground hover:bg-background/80 rounded-lg transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => toggleCollapse(stage.key)}
                        title="Collapse column"
                        className="p-1 text-muted hover:text-foreground hover:bg-background/80 rounded-lg transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Column Cards Container */}
                  <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 min-h-[120px] scrollbar-thin">
                    {stageLeads.map((lead) => {
                      const next = getNextStage(lead.current_stage_key);
                      const prev = getPrevStage(lead.current_stage_key);
                      const isAdvancing = movingId === lead.id;

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => setSelectedLead(lead)}
                          className={`group relative bg-background/90 hover:bg-background border border-border/80 hover:border-accent-blue/50 rounded-xl p-3 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer select-none ${
                            isAdvancing ? "opacity-60 scale-[0.98]" : ""
                          }`}
                        >
                          {/* Top Row: Lead Name & Quick Score */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm text-foreground group-hover:text-accent-blue truncate transition-colors">
                                {lead.name}
                              </h3>
                              {lead.company ? (
                                <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5 truncate">
                                  <Building2 size={12} className="shrink-0 text-muted/80" />
                                  <span className="truncate">{lead.company}</span>
                                </div>
                              ) : lead.email ? (
                                <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5 truncate">
                                  <Mail size={12} className="shrink-0 text-muted/80" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              ) : null}
                            </div>

                            {/* Score pill */}
                            {typeof lead.score === "number" && lead.score > 0 && (
                              <span
                                title={`Lead Score: ${lead.score}/100`}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                                  lead.score >= 70
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : lead.score >= 40
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                }`}
                              >
                                {lead.score}
                              </span>
                            )}
                          </div>

                          {/* Tags preview */}
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              {lead.tags.slice(0, 2).map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] font-medium px-1.5 py-0.5 bg-header/60 text-muted border border-border/50 rounded-md"
                                >
                                  #{t}
                                </span>
                              ))}
                              {lead.tags.length > 2 && (
                                <span className="text-[10px] text-muted/70 self-center">
                                  +{lead.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Footer with stage action buttons */}
                          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/40 text-xs">
                            <span className="text-[11px] text-muted/70 flex items-center gap-1">
                              <Clock size={11} />
                              {new Date(lead.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>

                            <div className="flex items-center gap-1">
                              {/* Backward stage movement if available */}
                              {prev && (
                                <button
                                  type="button"
                                  onClick={(e) => handleAdvance(lead.id, prev.key, e)}
                                  disabled={isAdvancing}
                                  title={`Move back to ${prev.label}`}
                                  className="p-1 text-muted/60 hover:text-foreground hover:bg-header/80 rounded transition-colors"
                                >
                                  <ChevronLeft size={13} />
                                </button>
                              )}

                              {/* Forward stage movement */}
                              {next && (
                                <button
                                  type="button"
                                  onClick={(e) => handleAdvance(lead.id, next.key, e)}
                                  disabled={isAdvancing}
                                  title={`Advance to ${next.label}`}
                                  className="px-2 py-0.5 rounded-md bg-accent-blue/10 hover:bg-accent-blue text-accent-blue hover:text-white transition-all text-[11px] font-medium flex items-center gap-1 border border-accent-blue/20"
                                >
                                  {isAdvancing && targetStageKey === next.key ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <>
                                      <span>{next.label}</span>
                                      <ChevronRight size={12} />
                                    </>
                                  )}
                                </button>
                              )}

                              {/* If won */}
                              {stage.is_won && (
                                <span className="text-[11px] text-accent-green font-medium flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  Won
                                </span>
                              )}

                              {/* If lost */}
                              {stage.is_lost && (
                                <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                                  <XCircle size={12} />
                                  Lost
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {stageLeads.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border/60 rounded-xl text-center">
                        <p className="text-xs text-muted font-medium">No leads in {stage.label}</p>
                        <button
                          onClick={() => {
                            setQuickAddDefaultStage(stage.key);
                            setQuickAddOpen(true);
                          }}
                          className="mt-2 text-xs text-accent-blue hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} />
                          Add a lead
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* COMPACT GROUPED LIST VIEW */
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {allColumns.map((stage) => {
            const stageLeads = leadsByStage.get(stage.key) || [];
            if (activeStageFilter !== "all" && activeStageFilter !== stage.key) return null;
            const theme = STAGE_THEMES[stage.key] || STAGE_THEMES.lead;

            return (
              <div
                key={stage.key}
                className="bg-header/20 border border-border/70 rounded-2xl overflow-hidden"
              >
                <div className="p-3 bg-header/40 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                      {stage.label}
                    </h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${theme.badge}`}>
                      {stageLeads.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setQuickAddDefaultStage(stage.key);
                      setQuickAddOpen(true);
                    }}
                    className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} />
                    Add Lead
                  </button>
                </div>

                <div className="divide-y divide-border/40">
                  {stageLeads.map((lead) => {
                    const next = getNextStage(lead.current_stage_key);
                    const prev = getPrevStage(lead.current_stage_key);
                    const isAdvancing = movingId === lead.id;

                    return (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-background/80 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-xs shrink-0">
                            {lead.name[0]?.toUpperCase() || "L"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground hover:text-accent-blue truncate">
                                {lead.name}
                              </span>
                              {typeof lead.score === "number" && lead.score > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-header text-muted border border-border">
                                  {lead.score} pts
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-0.5">
                              {lead.company && (
                                <span className="flex items-center gap-1">
                                  <Building2 size={12} />
                                  {lead.company}
                                </span>
                              )}
                              {lead.email && (
                                <span className="flex items-center gap-1">
                                  <Mail size={12} />
                                  {lead.email}
                                </span>
                              )}
                              {lead.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={12} />
                                  {lead.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions in list row */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="hidden md:flex items-center gap-1 mr-2">
                              {lead.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-header border border-border text-muted"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}

                          {prev && (
                            <button
                              onClick={(e) => handleAdvance(lead.id, prev.key, e)}
                              disabled={isAdvancing}
                              title={`Back to ${prev.label}`}
                              className="px-2 py-1 text-xs text-muted hover:text-foreground bg-header/50 border border-border rounded-lg transition-colors"
                            >
                              <ChevronLeft size={13} className="inline mr-1" />
                              {prev.label}
                            </button>
                          )}

                          {next && (
                            <button
                              onClick={(e) => handleAdvance(lead.id, next.key, e)}
                              disabled={isAdvancing}
                              title={`Advance to ${next.label}`}
                              className="px-2.5 py-1 text-xs font-medium text-accent-blue hover:text-white bg-accent-blue/15 hover:bg-accent-blue border border-accent-blue/30 rounded-lg transition-all flex items-center gap-1"
                            >
                              {isAdvancing && targetStageKey === next.key ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <>
                                  <span>{next.label}</span>
                                  <ChevronRight size={13} />
                                </>
                              )}
                            </button>
                          )}

                          <Link
                            href={`/crm/leads/${lead.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-muted hover:text-foreground hover:bg-header rounded-lg transition-colors"
                            title="Open full page"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {stageLeads.length === 0 && (
                    <p className="text-xs text-muted py-4 px-4 text-center">No leads currently in this stage.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK PREVIEW / LEAD DETAIL MODAL DRAWER */}
      {selectedLead && (
        <CrmModal
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          title={`Lead: ${selectedLead.name}`}
          widthClassName="max-w-xl"
        >
          <div className="space-y-4">
            {/* Quick status bar */}
            <div className="flex items-center justify-between p-3 bg-header/40 border border-border rounded-xl">
              <div>
                <span className="text-xs text-muted block uppercase tracking-wider font-semibold">Current Stage</span>
                <span className="text-sm font-bold text-foreground">
                  {allColumns.find((s) => s.key === selectedLead.current_stage_key)?.label || selectedLead.current_stage_key}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    selectedLead.status === "won"
                      ? "bg-accent-green/15 text-accent-green"
                      : selectedLead.status === "lost"
                      ? "bg-rose-400/15 text-rose-400"
                      : "bg-accent-blue/15 text-accent-blue"
                  }`}
                >
                  {selectedLead.status}
                </span>
                {typeof selectedLead.score === "number" && (
                  <span className="text-xs px-2 py-1 bg-header text-foreground border border-border rounded-lg font-bold">
                    Score: {selectedLead.score}
                  </span>
                )}
              </div>
            </div>

            {/* Stage Progression Quick-Select Bar */}
            <div>
              <label className={crmLabelClass}>Move to Stage</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allColumns.map((st) => {
                  const isCurrent = selectedLead.current_stage_key === st.key;
                  return (
                    <button
                      key={st.key}
                      onClick={() => handleAdvance(selectedLead.id, st.key)}
                      disabled={isCurrent || movingId === selectedLead.id}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
                        isCurrent
                          ? "bg-accent-blue text-white border-accent-blue font-bold shadow-sm"
                          : "bg-header/40 border-border text-muted hover:text-foreground hover:bg-header"
                      }`}
                    >
                      {movingId === selectedLead.id && targetStageKey === st.key ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <span>{st.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-header/20 border border-border p-3 rounded-xl">
              <div>
                <span className="text-muted block font-semibold mb-0.5">Company</span>
                <span className="text-foreground font-medium">{selectedLead.company || "—"}</span>
              </div>
              <div>
                <span className="text-muted block font-semibold mb-0.5">Email</span>
                <span className="text-foreground font-medium">{selectedLead.email || "—"}</span>
              </div>
              <div>
                <span className="text-muted block font-semibold mb-0.5">Phone</span>
                <span className="text-foreground font-medium">{selectedLead.phone || "—"}</span>
              </div>
              <div>
                <span className="text-muted block font-semibold mb-0.5">Source</span>
                <span className="text-foreground font-medium">{selectedLead.source || "—"}</span>
              </div>
              {selectedLead.tags && selectedLead.tags.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-muted block font-semibold mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedLead.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-header rounded text-foreground border border-border">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedLead.notes && (
                <div className="sm:col-span-2">
                  <span className="text-muted block font-semibold mb-0.5">Notes</span>
                  <p className="text-foreground whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href={`/crm/leads/${selectedLead.id}`}
                className="text-xs text-accent-blue hover:underline flex items-center gap-1.5 font-medium"
              >
                <ExternalLink size={14} />
                Open Full Lead Profile
              </Link>
              <button onClick={() => setSelectedLead(null)} className={crmSecondaryBtnClass}>
                Close
              </button>
            </div>
          </div>
        </CrmModal>
      )}

      {/* QUICK ADD LEAD MODAL */}
      <CrmModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        title="Add Lead to Pipeline"
      >
        <form onSubmit={handleQuickAdd} className="flex flex-col gap-3">
          <div>
            <label className={crmLabelClass} htmlFor="name">
              Lead Name *
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="e.g. Acme Diagnostic Centre"
              className={crmInputClass}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={crmLabelClass} htmlFor="company">
                Company
              </label>
              <input id="company" name="company" placeholder="Acme Inc." className={crmInputClass} />
            </div>
            <div>
              <label className={crmLabelClass} htmlFor="score">
                Lead Score (0-100)
              </label>
              <input id="score" name="score" type="number" min={0} max={100} defaultValue={50} className={crmInputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={crmLabelClass} htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" placeholder="contact@example.com" className={crmInputClass} />
            </div>
            <div>
              <label className={crmLabelClass} htmlFor="phone">
                Phone
              </label>
              <input id="phone" name="phone" placeholder="+234..." className={crmInputClass} />
            </div>
          </div>

          <div>
            <label className={crmLabelClass} htmlFor="tags">
              Tags (comma separated)
            </label>
            <input id="tags" name="tags" placeholder="urgent, referral, enterprise" className={crmInputClass} />
          </div>

          <div>
            <label className={crmLabelClass} htmlFor="notes">
              Notes
            </label>
            <textarea id="notes" name="notes" rows={2} placeholder="Initial context..." className={crmInputClass} />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setQuickAddOpen(false)}
              className={crmSecondaryBtnClass}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className={crmPrimaryBtnClass}>
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Create Lead
            </button>
          </div>
        </form>
      </CrmModal>
    </div>
  );
}
