'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Zap, ExternalLink, RefreshCw, Radio } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  time: number;
  source: string;
}

export default function FlashNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    setLoading(true);
    try {
      // Fetch latest security/tech stories from HN Algolia API for higher relevancy
      const response = await fetch(
        'https://hn.algolia.com/api/v1/search_by_date?tags=story&query=vulnerability,hack,launch,security&hitsPerPage=5'
      );
      const data = await response.json();
      
      const formattedNews = data.hits.map((hit: any) => ({
        id: hit.objectID,
        title: hit.title,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        time: hit.created_at_i,
        source: hit.url ? new URL(hit.url).hostname.replace('www.', '') : 'Hacker News'
      }));
      
      setNews(formattedNews);
    } catch (err) {
      console.error('Failed to fetch flash news:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden group">
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-red-400/10 blur-3xl rounded-full group-hover:bg-red-400/20 transition-all duration-700" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio size={20} className="text-red-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Flash News</h2>
        </div>
        <button 
          onClick={fetchNews}
          disabled={loading}
          className="p-1.5 text-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-red-400/5 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 group/item border-b border-red-400/10 pb-3 last:border-0 last:pb-0"
            >
              <div className="mt-1">
                <ShieldAlert size={14} className="text-red-400 group-hover/item:scale-110 transition-transform" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground group-hover/item:text-red-400 transition-colors leading-tight">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted font-mono">
                  <span className="text-red-400/60 font-bold uppercase">{item.source}</span>
                  <span>•</span>
                  <span>{new Date(item.time * 1000).toLocaleTimeString()}</span>
                </div>
              </div>
              <ExternalLink size={12} className="text-muted opacity-0 group-hover/item:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
