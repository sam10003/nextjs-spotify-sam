'use client';

import { useState } from 'react';

/**
 * WidgetContainer - Base container component for all widgets
 * 
 * Provides consistent styling and structure for widget components with collapse/expand functionality
 * 
 * @param {Object} props
 * @param {string} props.title - Widget title
 * @param {React.ReactNode} props.children - Widget content
 * @param {string} props.icon - Optional emoji icon for the widget
 * @param {boolean} props.defaultExpanded - Whether widget starts expanded (default: true)
 */
export default function WidgetContainer({ title, children, icon = '🎵', defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="group relative backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 hover:border-[#1DB954]/40 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden">
      {/* Header - Always visible, consistent height */}
      <div 
        className="flex items-center justify-between p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1DB954]/20 flex items-center justify-center text-xl group-hover:bg-[#1DB954]/30 transition-colors">
            {icon}
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-[#1DB954] transition-colors duration-200">{title}</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Content - Collapsible */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
}

