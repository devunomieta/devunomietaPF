'use client';

import { useState, useEffect } from 'react';
import { getDailyIdeas, PostIdea } from '@/lib/ideas-data';
import { generateAIRecommendations, generateDraftContent } from './actions';
import { Lightbulb, Shield, Code, Settings, Zap, AlertTriangle, Sparkles, RefreshCw, BrainCircuit, FileText, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function IdeasPage() {
  const [mounted, setMounted] = useState(false);
  const [recommendations, setRecommendations] = useState<PostIdea[]>([]);
  const [controversial, setControversial] = useState<PostIdea[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  
  const [selectedIdea, setSelectedIdea] = useState<PostIdea | null>(null);
  
  // Initialize with daily ideas
  useEffect(() => {
    setMounted(true);
    const allIdeas = getDailyIdeas(15);
    setRecommendations(allIdeas.filter(i => i.category !== 'Controversial').slice(0, 8));
    setControversial(allIdeas.filter(i => i.category === 'Controversial').slice(0, 4));
  }, []);

  const refreshRecommendations = () => {
    // Randomly pick from a larger pool for variety
    const newPool = getDailyIdeas(24).filter(i => i.category !== 'Controversial');
    const shuffled = [...newPool].sort(() => Math.random() - 0.5);
    setRecommendations(shuffled.slice(0, 8));
  };

  const refreshControversial = () => {
    const newPool = getDailyIdeas(24).filter(i => i.category === 'Controversial');
    const shuffled = [...newPool].sort(() => Math.random() - 0.5);
    setControversial(shuffled.slice(0, 4));
  };

  const handleAiGeneration = async () => {
    setIsAiLoading(true);
    try {
      const newIdeas = await generateAIRecommendations([], []);
      setRecommendations(newIdeas.filter(i => i.category !== 'Controversial'));
      setControversial(newIdeas.filter(i => i.category === 'Controversial'));
    } catch (error) {
      console.error(error);
      alert('Failed to generate AI ideas. Please ensure your Gemini API key is set.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDraftGeneration = async (idea: PostIdea) => {
    setIsDraftLoading(true);
    try {
      const content = await generateDraftContent(
        idea.title, 
        idea.insight || idea.description, 
        idea.conventionalAngle || "", 
        idea.controversialAngle || ""
      );
      setDraftContent(content);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to generate draft.');
    } finally {
      setIsDraftLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedIdea(null);
    setDraftContent(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Security': return <Shield size={16} />;
      case 'SDLC': return <Settings size={16} />;
      case 'Development': return <Code size={16} />;
      case 'Tools': return <Zap size={16} />;
      case 'Controversial': return <AlertTriangle size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Security': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'SDLC': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'Development': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Tools': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'Controversial': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2.5 bg-accent-blue/10 rounded-xl text-accent-blue">
              <Lightbulb size={28} />
            </div>
            Content Engine
          </h1>
          <p className="text-muted mt-2 max-w-2xl">
            Request manual recommendations or use **Gemini AI** to brainstorm unique topics and generate drafts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAiGeneration}
            disabled={isAiLoading}
            className="group px-6 py-3 bg-gradient-to-r from-accent-blue to-purple-600 hover:from-accent-blue/90 hover:to-purple-600/90 text-white text-base font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAiLoading ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <BrainCircuit size={20} className="group-hover:scale-110 transition-transform" />
            )}
            {isAiLoading ? 'AI Brainstorming...' : 'Smart AI Brainstorm'}
          </button>
        </div>
      </div>

      <div className="space-y-12 max-w-4xl">
        {/* Main Ideas Column */}
        <div className="space-y-12">
          
          {/* Section 1: Daily Recommendations */}
          <section>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 flex-1">
                <h2 className="text-xl font-bold text-foreground whitespace-nowrap">Recommendations</h2>
                <div className="h-px w-full bg-gradient-to-r from-border to-transparent"></div>
              </div>
              <button 
                onClick={refreshRecommendations}
                className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue text-xs font-bold rounded-lg border border-accent-blue/20 transition-all uppercase tracking-wider"
              >
                <RefreshCw size={14} /> Recommend
              </button>
            </div>
            
            <div className="space-y-4">
              {recommendations.map((idea) => (
                <div 
                  key={idea.id + Math.random()}
                  onClick={() => setSelectedIdea(idea)}
                  className="group flex flex-col md:flex-row md:items-center gap-4 p-5 bg-header/40 border border-border rounded-xl hover:border-accent-blue/40 hover:bg-accent-blue/5 transition-all duration-300 cursor-pointer"
                >
                  <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border ${getCategoryColor(idea.category)}`}>
                    {getCategoryIcon(idea.category)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-accent-blue transition-colors truncate">
                        {idea.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getCategoryColor(idea.category)}`}>
                        {idea.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted line-clamp-1">
                      {idea.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-0.5">Impact</div>
                      <div className={`text-xs font-bold uppercase ${idea.impact === 'High' ? 'text-red-400' : idea.impact === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {idea.impact}
                      </div>
                    </div>
                    <button className="p-2 text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors" title="Draft Post">
                      <Sparkles size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Controversial & Myths */}
          <section>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 flex-1">
                <h2 className="text-xl font-bold text-purple-400 whitespace-nowrap">Controversial & Myths</h2>
                <div className="h-px w-full bg-gradient-to-r from-purple-400/30 to-transparent"></div>
              </div>
              <button 
                onClick={refreshControversial}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-400/10 hover:bg-purple-400/20 text-purple-400 text-xs font-bold rounded-lg border border-purple-400/20 transition-all uppercase tracking-wider"
              >
                <RefreshCw size={14} /> Recommend
              </button>
            </div>
            
            <div className="space-y-4">
              {controversial.map((idea) => (
                <div 
                  key={idea.id + Math.random()}
                  onClick={() => setSelectedIdea(idea)}
                  className="group flex flex-col md:flex-row md:items-center gap-4 p-5 bg-purple-400/5 border border-purple-400/20 rounded-xl hover:border-purple-400/40 hover:bg-purple-400/10 transition-all duration-300 cursor-pointer"
                >
                  <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border border-purple-400/20 text-purple-400 bg-purple-400/10">
                    <AlertTriangle size={24} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground group-hover:text-purple-400 transition-colors mb-1">
                      {idea.title}
                    </h3>
                    <p className="text-sm text-muted italic">
                      {idea.description}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <button className="px-4 py-2 bg-purple-400/10 hover:bg-purple-400/20 text-purple-400 text-xs font-bold rounded-lg border border-purple-400/20 transition-all">
                      Debunk This
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>


      {/* Insight Modal */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`bg-header border border-border rounded-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 transition-all ${draftContent ? 'max-w-4xl max-h-[90vh]' : 'max-w-2xl'}`}>
            <div className="p-6 border-b border-border flex items-center justify-between bg-header/50">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl border ${getCategoryColor(selectedIdea.category)}`}>
                  {getCategoryIcon(selectedIdea.category)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground leading-tight">{selectedIdea.title}</h3>
                  <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">{selectedIdea.category} • Impact: {selectedIdea.impact}</p>
                </div>
              </div>
              <button 
                onClick={closeModal}
                className="p-2 text-muted hover:text-foreground transition-colors hover:bg-red-400/10 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
              {!draftContent ? (
                <div className="space-y-8">
                  <div>
                    <h4 className="text-sm font-bold text-accent-blue uppercase tracking-wider mb-3">Core Insight</h4>
                    <p className="text-foreground leading-relaxed">
                      {selectedIdea.insight || "No detailed insight available for this topic yet. It explores the technical and organizational implications of modern software engineering practices."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="p-4 bg-emerald-400/5 border border-emerald-400/20 rounded-xl">
                      <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-2">Conventional Angle</h4>
                      <p className="text-sm text-muted">
                        {selectedIdea.conventionalAngle || "The widely accepted industry standard approach focusing on established best practices."}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-400/5 border border-purple-400/20 rounded-xl">
                      <h4 className="text-[11px] font-black text-purple-400 uppercase tracking-widest mb-2">Controversial Angle</h4>
                      <p className="text-sm text-muted">
                        {selectedIdea.controversialAngle || "A provocative take that challenges the status quo and encourages critical thinking."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted prose-strong:text-accent-blue">
                  <div className="flex items-center gap-2 mb-6 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-lg text-accent-blue text-sm font-bold">
                    <Sparkles size={16} />
                    Gemini AI Draft Generated
                  </div>
                  <ReactMarkdown>{draftContent}</ReactMarkdown>
                </div>
              )}
            </div>

            <div className="p-6 bg-header/50 border-t border-border flex justify-end gap-3">
              <button 
                onClick={closeModal}
                className="px-6 py-2 text-sm font-bold text-muted hover:text-foreground transition-colors"
              >
                {draftContent ? 'Discard Draft' : 'Close'}
              </button>
              {!draftContent ? (
                <button 
                  onClick={() => handleDraftGeneration(selectedIdea)}
                  disabled={isDraftLoading}
                  className="px-6 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isDraftLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {isDraftLoading ? 'Generating Post...' : 'Draft Discussion'}
                </button>
              ) : (
                <button 
                  onClick={() => {
                    // Pre-fill "New Post" form logic could go here
                    // For now, we'll just show it
                    alert('Draft ready! You can now copy-paste this into your New Post editor.');
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2"
                >
                  <FileText size={16} /> Finalize Post
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
