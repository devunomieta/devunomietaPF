'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, TrendingUp, RefreshCw } from 'lucide-react';

interface TrendingItem {
  id: number;
  title: string;
  url?: string;
  score: number;
  time: number;
}

export default function TrendingTrends() {
  const [trends, setTrends] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch top stories from Hacker News
      const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const storyIds = await response.json();
      
      // Get details for top 6 stories (more compact)
      const storyPromises = storyIds.slice(0, 6).map(async (id: number) => {
        const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return storyRes.json();
      });

      const storyDetails = await Promise.all(storyPromises);
      setTrends(storyDetails);
    } catch (err) {
      console.error('Failed to fetch trends:', err);
      setError('Failed to load real-time trends.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  return (
    <div className="bg-header/30 border border-border rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-accent-blue/10 rounded-lg text-accent-blue">
            <TrendingUp size={20} />
          </div>
          <h2 className="text-xl font-bold text-foreground">Tech Trends</h2>
        </div>
        <button 
          onClick={fetchTrends}
          disabled={loading}
          className="p-2 text-muted hover:text-foreground transition-colors rounded-full hover:bg-accent-blue/10 disabled:opacity-50"
          title="Refresh Trends"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-accent-blue/5 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted">
          <p>{error}</p>
          <button onClick={fetchTrends} className="mt-4 text-accent-blue hover:underline">Try again</button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {trends.map((item) => (

            <a
              key={item.id}
              href={item.url || `https://news.ycombinator.com/item?id=${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-3 bg-header/50 border border-border/50 rounded-lg hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-foreground group-hover:text-accent-blue transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted uppercase tracking-wider font-semibold">
                    <span>{item.score} points</span>
                    <span>•</span>
                    <span>{new Date(item.time * 1000).toLocaleTimeString()}</span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-muted group-hover:text-accent-blue transition-colors shrink-0" />
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-border/50">
        <p className="text-[11px] text-muted text-center italic">
          Sourced from top real-time search and social activity in the tech community.
        </p>
      </div>
    </div>
  );
}
