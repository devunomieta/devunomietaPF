"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

export function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
    };

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = (Number(e.target.value) / 100) * duration;
      audioRef.current.currentTime = time;
      setProgress(Number(e.target.value));
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 bg-header/60 border border-border/80 p-5 rounded-2xl shadow-xl glow mb-10 w-full backdrop-blur-sm">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <button 
        onClick={togglePlay}
        className="w-14 h-14 rounded-full bg-accent-blue text-white flex items-center justify-center hover:bg-accent-blue/90 transition-all hover:scale-105 active:scale-95 shrink-0 shadow-lg shadow-accent-blue/20"
      >
        {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
      </button>

      <div className="flex-1 w-full flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-mono text-muted">
          <span className="font-medium text-foreground">{formatTime(currentTime)}</span>
          <span className="text-accent-blue text-[10px] uppercase tracking-widest font-sans font-bold bg-accent-blue/10 px-2 py-0.5 rounded-full border border-accent-blue/20">Listen to Article</span>
          <span className="font-medium">{formatTime(duration)}</span>
        </div>
        
        <input 
          type="range" 
          min="0" max="100" 
          value={isNaN(progress) ? 0 : progress} 
          onChange={handleSeek}
          className="w-full h-1.5 bg-background rounded-full appearance-none cursor-pointer accent-accent-blue"
        />
      </div>

      <button onClick={toggleMute} className="text-muted hover:text-foreground transition-colors hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-background shrink-0">
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}
