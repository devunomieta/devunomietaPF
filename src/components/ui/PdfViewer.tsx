"use client";

import { FileText, Download } from "lucide-react";

export function PdfViewer({ src, title }: { src: string, title?: string }) {
  return (
    <div className="flex flex-col gap-0 my-8 shadow-2xl glow rounded-xl">
      <div className="flex items-center justify-between bg-header border border-border px-4 py-3 rounded-t-xl z-10 relative shadow-md">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-accent-blue" />
          <span className="text-sm font-semibold text-foreground">Document Viewer</span>
        </div>
        <a 
          href={src} 
          download 
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-background px-3 py-1.5 rounded-md transition-colors"
        >
          <Download size={14} /> Download PDF
        </a>
      </div>
      <div className="w-full h-[80vh] min-h-[600px] border border-t-0 border-border rounded-b-xl overflow-hidden bg-white relative">
        <iframe 
          src={`${src}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} 
          className="w-full h-full border-none absolute inset-0"
          title={title || "PDF Document"}
        />
      </div>
    </div>
  );
}
