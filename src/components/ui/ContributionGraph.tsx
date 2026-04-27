"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface ContributionGraphProps {
  activityData?: Record<string, number>;
}

// Generates a contribution grid that spells out DEVUNOMIETA
const generateTextGrid = (activityData: Record<string, number> = {}) => {
  // UNOMIETA text art (8 letters)
  const textArt = [
    "1001 10001 0110 10001 111 1111 11111 0110",
    "1001 11001 1001 11011 010 1000 00100 1001",
    "1001 10101 1001 10101 010 1000 00100 1001",
    "1001 10011 1001 10001 010 1110 00100 1111",
    "1001 10001 1001 10001 010 1000 00100 1001",
    "1001 10001 1001 10001 010 1000 00100 1001",
    "0110 10001 0110 10001 111 1111 00100 1001",
  ];

  const cols = 53; // Standard GitHub year view
  const grid = [];
  let totalMocked = 0;
  
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - (cols * 7));

  for (let w = 0; w < cols; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (w * 7) + d);
      const dateKey = currentDate.toISOString().split('T')[0];
      
      const realInquiryActivity = activityData[dateKey] || 0;
      
      // Determine if this cell is part of the "UNOMIETA" text
      const textColOffset = Math.floor((cols - textArt[0].length) / 2);
      const textCol = w - textColOffset;
      let isTextCell = false;
      if (textCol >= 0 && textCol < textArt[0].length) {
        isTextCell = textArt[d][textCol] === '1';
      }

      // Check for proximity to text to create a "breathable" buffer
      let isNearText = false;
      if (!isTextCell) {
        for (let dw = -1; dw <= 1; dw++) {
          for (let dd = -1; dd <= 1; dd++) {
            const nw = textCol + dw;
            const nd = d + dd;
            if (nw >= 0 && nw < textArt[0].length && nd >= 0 && nd < 7) {
              if (textArt[nd][nw] === '1') isNearText = true;
            }
          }
        }
      }

      // Background activity
      const skipDay = Math.random() > 0.3;
      const mockCodeActivity = (skipDay || isNearText) ? 0 : Math.floor(Math.random() * 8 + 2);
      totalMocked += mockCodeActivity;

      let finalIntensity = 0;
      if (isTextCell) {
        finalIntensity = 4;
      } else if (realInquiryActivity > 0) {
        finalIntensity = 3; 
      } else if (mockCodeActivity > 0) {
        finalIntensity = Math.random() > 0.7 ? 2 : 1;
      }
      
      week.push({ intensity: finalIntensity, isText: isTextCell });
    }
    grid.push(week);
  }

  return { grid, totalMocked };
};

const getIntensityColor = (intensity: number) => {
  switch (intensity) {
    case 4: return "bg-[#39d353]"; 
    case 3: return "bg-[#26a641]"; 
    case 2: return "bg-[#006d32]"; 
    case 1: return "bg-[#0e4429]"; 
    default: return "bg-[#161b22]"; 
  }
};

export function ContributionGraph({ activityData = {} }: ContributionGraphProps) {
  const { grid, totalMocked } = useMemo(() => generateTextGrid(activityData), [activityData]);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const totalInquiries = Object.values(activityData).reduce((a, b) => a + b, 0);
  const grandTotal = totalInquiries + totalMocked;

  return (
    <div className="border border-border rounded-xl p-6 bg-background overflow-hidden relative">
      <div className="flex items-baseline gap-2 mb-6">
        <span className="font-mono text-accent-green text-lg font-bold min-w-[3ch] inline-block">
          {mounted ? grandTotal.toLocaleString() : "..."}
        </span>
        <span className="text-muted text-xs font-medium">
          contributions in the last year
        </span>
      </div>
      
      <div className="overflow-hidden pb-2 select-none flex justify-center min-h-[105px]">
        {mounted ? (
          <motion.div 
            className="flex gap-[3px] min-w-max"
            animate={isMobile ? {
              x: [0, -400, -400, -800, -800, 0],
            } : {}}
            transition={isMobile ? {
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.4, 0.45, 0.9, 0.95, 1]
            } : {}}
          >
            {grid.map((week, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {week.map((cell, j) => (
                  <motion.div
                    key={`${i}-${j}`}
                    animate={cell.isText ? {
                      opacity: [1, 0.6, 1],
                      filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
                    } : {}}
                    transition={cell.isText ? {
                      duration: 3,
                      repeat: Infinity,
                      delay: (i * 0.04) + (j * 0.08),
                    } : {}}
                    className={cn(
                      "w-[12px] h-[12px] rounded-[2px] transition-all duration-500",
                      getIntensityColor(cell.intensity),
                      cell.isText ? "shadow-[0_0_10px_rgba(57,211,83,0.45)] z-10" : "opacity-80"
                    )}
                  />
                ))}
              </div>
            ))}
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted/20 text-xs font-mono">
            Initializing neural activity...
          </div>
        )}
      </div>
      
      <div className="mt-8 flex items-center justify-between text-[10px] text-muted border-t border-border/30 pt-4">
        <div className="flex items-center gap-4">
            <span className="hidden sm:inline italic">Portfolio Engine: Data-Driven Contributions</span>
            <div className="flex items-center gap-1.5">
                <span>Less</span>
                <div className="w-[10px] h-[10px] rounded-sm bg-[#161b22]"></div>
                <div className="w-[10px] h-[10px] rounded-sm bg-[#0e4429]"></div>
                <div className="w-[10px] h-[10px] rounded-sm bg-[#006d32]"></div>
                <div className="w-[10px] h-[10px] rounded-sm bg-[#26a641]"></div>
                <div className="w-[10px] h-[10px] rounded-sm bg-[#39d353]"></div>
                <span>More</span>
            </div>
        </div>
        <span className="font-mono text-accent-blue/40 font-bold uppercase tracking-widest">
            UNOMIETA
        </span>
      </div>
    </div>
  );
}
