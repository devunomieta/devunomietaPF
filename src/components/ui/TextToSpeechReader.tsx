"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Square, Volume2, VolumeX, Headphones, RotateCcw } from "lucide-react";

interface TextToSpeechReaderProps {
  containerId: string;
}

export function TextToSpeechReader({ containerId }: TextToSpeechReaderProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isMuted, setIsMuted] = useState(false);

  const elementsRef = useRef<HTMLElement[]>([]);
  const currentIndexRef = useRef<number>(0);
  const isMutedRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);
    }
    
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        clearAllHighlights();
      }
    };
  }, []);

  const updatePlayingStatus = (playing: boolean, paused: boolean) => {
    setIsPlaying(playing);
    setIsPaused(paused);
    isPlayingRef.current = playing;
  };

  const clearAllHighlights = () => {
    document.querySelectorAll(".tts-highlight").forEach((el) => {
      el.classList.remove(
        "tts-highlight",
        "bg-accent-blue/5",
        "border-l-4",
        "border-accent-blue",
        "pl-4",
        "transition-all",
        "duration-300"
      );
    });
  };

  const highlightElement = (el: HTMLElement) => {
    clearAllHighlights();
    el.classList.add(
      "tts-highlight",
      "bg-accent-blue/5",
      "border-l-4",
      "border-accent-blue",
      "pl-4",
      "transition-all",
      "duration-300"
    );
  };

  const parseContent = () => {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const list = Array.from(container.querySelectorAll(".tts-block")) as HTMLElement[];
    return list.filter((el) => (el.textContent?.trim().length ?? 0) > 0);
  };

  const speakCurrentElement = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const index = currentIndexRef.current;
    if (index >= elementsRef.current.length) {
      updatePlayingStatus(false, false);
      setProgress({ current: elementsRef.current.length, total: elementsRef.current.length });
      clearAllHighlights();
      return;
    }

    const activeElement = elementsRef.current[index];
    setProgress({ current: index + 1, total: elementsRef.current.length });
    
    activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
    highlightElement(activeElement);

    const text = activeElement.textContent || "";
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural"))
    ) || voices.find((v) => v.lang.startsWith("en"));
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.volume = isMutedRef.current ? 0 : 1;
    utterance.rate = 1.0;
    
    utterance.onend = () => {
      // Fix the stale closure by referencing the active ref
      if (isPlayingRef.current) {
        currentIndexRef.current += 1;
        speakCurrentElement();
      }
    };

    utterance.onerror = (event) => {
      if (event.error !== "interrupted") {
        console.error("TTS utterance error:", event);
        updatePlayingStatus(false, false);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayPause = () => {
    if (!window.speechSynthesis) return;

    if (isPlaying) {
      // Pause current playing
      updatePlayingStatus(false, true);
      window.speechSynthesis.cancel();
      return;
    }

    if (isPaused) {
      // Resume
      updatePlayingStatus(true, false);
      speakCurrentElement();
      return;
    }

    // Start new
    const blocks = parseContent();
    if (blocks.length === 0) return;

    elementsRef.current = blocks;
    currentIndexRef.current = 0;
    updatePlayingStatus(true, false);
    
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        speakCurrentElement();
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      speakCurrentElement();
    }
  };

  const handleStop = () => {
    if (!window.speechSynthesis) return;
    updatePlayingStatus(false, false);
    currentIndexRef.current = 0;
    window.speechSynthesis.cancel();
    clearAllHighlights();
    setProgress({ current: 0, total: elementsRef.current.length });
  };

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    isMutedRef.current = newState;
    if (isPlaying) {
      speakCurrentElement();
    }
  };

  if (!isSupported) return null;

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 sm:gap-5 bg-header/60 border border-border/80 p-3 sm:p-5 rounded-2xl shadow-xl glow mb-8 w-full backdrop-blur-sm transition-all duration-300">
      {/* Left: Main Toggle Play Button */}
      <button
        onClick={handlePlayPause}
        className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 shadow-lg ${
          isPlaying 
            ? "bg-accent-blue/20 border-2 border-accent-blue text-accent-blue hover:bg-accent-blue/30 shadow-accent-blue/10" 
            : "bg-accent-blue hover:bg-accent-blue/90 shadow-accent-blue/20"
        }`}
        title={isPlaying ? "Pause Reading" : "Read Article"}
      >
        {isPlaying ? (
          <Pause size={18} className="fill-current sm:scale-110" />
        ) : (
          <Play size={18} className="fill-current ml-0.5 sm:scale-110" />
        )}
      </button>

      {/* Center: Flexible progress track and badges */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 sm:gap-2.5">
        <div className="flex justify-between items-center text-xs font-mono text-muted gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-accent-blue text-[9px] sm:text-[10px] uppercase tracking-widest font-sans font-bold bg-accent-blue/10 px-2 py-0.5 rounded-full border border-accent-blue/20 flex items-center gap-1 shadow-sm shrink-0">
              <Headphones size={10} className={isPlaying ? "animate-pulse" : ""} />
              AI Reader
            </span>
            {isPlaying && (
              <span className="text-[9px] sm:text-[10px] text-accent-green animate-pulse font-bold uppercase shrink-0 truncate">Listening</span>
            )}
          </div>

          <div className="shrink-0 text-right">
            {progress.total > 0 ? (
              <span className="text-[10px] sm:text-[11px] font-semibold text-foreground/80">
                {progress.current}/{progress.total}
              </span>
            ) : (
              <span className="text-[9px] sm:text-[11px] text-muted truncate max-w-[90px] sm:max-w-none inline-block">Click Play</span>
            )}
          </div>
        </div>

        {/* Custom visual progress bar */}
        <div className="w-full h-1.5 sm:h-2 bg-background/80 border border-border/40 rounded-full overflow-hidden relative">
          <div
            style={{ width: `${percentage}%` }}
            className="h-full bg-gradient-to-r from-accent-blue to-blue-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(88,166,255,0.4)]"
          />
        </div>
      </div>

      {/* Right: Controls deck */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pl-2 border-l border-border/40">
        {(isPlaying || isPaused) && (
          <button
            onClick={handleStop}
            className="text-muted hover:text-red-400 transition-all flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl hover:bg-red-500/10"
            title="Stop"
          >
            <Square size={14} className="fill-current" />
          </button>
        )}

        <button
          onClick={toggleMute}
          className="text-muted hover:text-foreground transition-all flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl hover:bg-white/5"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
}
