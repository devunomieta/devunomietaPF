"use client";

import { motion } from "framer-motion";

// Generates a contribution grid that spells out DEVUNOMIETA
const generateTextGrid = () => {
  const textArt = [
    "1110 1111 10001 1001 10001 0110 10001 111 1111 11111 0110",
    "1001 1000 10001 1001 11001 1001 11011 010 1000 00100 1001",
    "1001 1000 10001 1001 10101 1001 10101 010 1000 00100 1001",
    "1001 1110 01010 1001 10011 1001 10001 010 1110 00100 1111",
    "1001 1000 01010 1001 10001 1001 10001 010 1000 00100 1001",
    "1001 1000 00100 1001 10001 1001 10001 010 1000 00100 1001",
    "1110 1111 00100 0110 10001 0110 10001 111 1111 00100 1001",
  ];

  const cols = textArt[0].length;
  const grid = [];

  for (let w = 0; w < cols; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const char = textArt[d][w];
      if (char === '1') {
        // High intensity for letters to make them stand out
        week.push(Math.random() > 0.3 ? 4 : 3);
      } else {
        // Random very low intensity noise for background
        const random = Math.random();
        if (random > 0.95) week.push(2);
        else if (random > 0.85) week.push(1);
        else week.push(0);
      }
    }
    grid.push(week);
  }

  // Pad with empty columns on left/right
  const emptyCol = () => Array(7).fill(0).map(() => (Math.random() > 0.9 ? 1 : 0));
  grid.unshift(emptyCol(), emptyCol());
  grid.push(emptyCol(), emptyCol());

  return grid;
};

const getIntensityColor = (intensity: number) => {
  switch (intensity) {
    case 4: return "bg-[#39d353]"; // Highest
    case 3: return "bg-[#26a641]";
    case 2: return "bg-[#006d32]";
    case 1: return "bg-[#0e4429]";
    default: return "bg-[#161b22]"; // Empty/bg
  }
};

export function ContributionGraph() {
  const grid = generateTextGrid();

  return (
    <div className="border border-border rounded-xl p-4 bg-background overflow-hidden relative">
      <h3 className="text-sm text-foreground mb-4 font-medium flex items-center gap-2">
        <span className="font-mono text-accent-green">1,337</span> contributions in the last year
      </h3>
      
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
        <div className="flex gap-[3px] min-w-max">
          {grid.map((week, i) => (
            <motion.div 
              key={i} 
              className="flex flex-col gap-[3px]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.01 }}
            >
              {week.map((intensity, j) => (
                <div
                  key={`${i}-${j}`}
                  className={`w-[10px] h-[10px] rounded-sm ${getIntensityColor(intensity)} transition-colors duration-300 hover:ring-1 hover:ring-foreground/50`}
                  title={`${intensity} contributions on this day`}
                />
              ))}
            </motion.div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-[10px] text-muted">
        <a href="#" className="hover:text-accent-blue transition-colors">Learn how we count contributions</a>
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
    </div>
  );
}
