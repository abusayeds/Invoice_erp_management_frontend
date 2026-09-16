/**
 * Fixed-position filter chip dropdown for list sidebars.
 * Absolute panels get clipped by ResizableListPanel / .list-filter-toolbar overflow.
 */
import React, { useEffect, useRef, useState } from "react";

export const ListFilterDropdown: React.FC<{
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  panelClass?: string;
}> = ({ trigger, children, align = "left", panelClass = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left?: number; right?: number; width: number } | null>(null);

  const updatePosition = () => {
    const node = ref.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    setRect({
      top: bounds.bottom + 8,
      left: align === "right" ? undefined : bounds.left,
      right: align === "right" ? window.innerWidth - bounds.right : undefined,
      width: bounds.width,
    });
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const sync = () => updatePosition();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open, align]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (!o) setTimeout(updatePosition, 0);
            return next;
          });
        }}
      >
        {trigger}
      </button>
      {open && rect && (
        <div
          ref={panelRef}
          className={`fixed z-50 min-w-[180px] max-h-[70vh] overflow-y-auto hover-scrollbar rounded-md border border-gray-200 bg-white py-1 shadow-xl ${panelClass}`}
          style={
            align === "right"
              ? { top: rect.top, right: rect.right }
              : { top: rect.top, left: rect.left, minWidth: Math.max(rect.width, 180) }
          }
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

export default ListFilterDropdown;
