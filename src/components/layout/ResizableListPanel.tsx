/**
 * File: src/components/layout/ResizableListPanel.tsx
 * Drop-in replacement for the master/detail list `<aside>` used across pages.
 * Renders the list column and a vertical drag handle on its right edge so the
 * user can widen/narrow the middle list panel (the detail panel flexes to fill
 * the rest). Only this panel is resizable — the sidebar is not.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

const MIN_WIDTH = 260;
const MAX_WIDTH = 620;
const DEFAULT_WIDTH = 340;

interface ResizableListPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const ResizableListPanel: React.FC<ResizableListPanelProps> = ({
  children,
  className = "",
}) => {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    setWidth(
      Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta)),
    );
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [width, handleMouseMove, handleMouseUp],
  );

  useEffect(
    () => () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  return (
    <aside
      style={{ width }}
      className={`relative flex-shrink-0 flex flex-col bg-white border-r border-gray-200 ${className}`}
    >
      {children}

      {/* Vertical drag handle — sits on the right edge (list ↔ detail divider) */}
      <div
        onMouseDown={handleDragStart}
        title="Drag to resize"
        className="group absolute right-0 top-0 bottom-0 w-2 translate-x-1/2 z-20 cursor-col-resize flex items-center justify-center"
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-transparent group-hover:bg-blue-400 transition-colors" />
        <span className="relative flex items-center justify-center h-9 w-4 rounded bg-white border border-gray-200 shadow-sm text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3.5 h-3.5" strokeWidth={2} />
        </span>
      </div>
    </aside>
  );
};

export default ResizableListPanel;
