/**
 * Nested side flyout for ⋮ menus (Duplicate ▸, Mark As ▸).
 * Portaled + fixed so it is not clipped by parent menu overflow.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  side?: "left" | "right";
  /** Keep parent submenu open while pointer is on the flyout. */
  onHoverChange?: (hovered: boolean) => void;
};

export const MenuSideFlyout: React.FC<Props> = ({
  open,
  anchorRef,
  children,
  className = "",
  side = "left",
  onHoverChange,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = () => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const pw = panel?.offsetWidth || 190;
    const ph = panel?.offsetHeight || 40;
    let left = side === "left" ? r.left - pw - 4 : r.right + 4;
    let top = r.top;
    if (left < 8) left = r.right + 4;
    if (left + pw > window.innerWidth - 8) left = Math.max(8, r.left - pw - 4);
    if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
    if (top < 8) top = 8;
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
  }, [open, side]);

  useEffect(() => {
    if (!open) return;
    const sync = () => place();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open, side]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={`fixed z-[90] min-w-[170px] bg-white border border-gray-200 rounded-md shadow-xl py-1 ${className}`}
      style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999, visibility: "hidden" }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      {children}
    </div>,
    document.body,
  );
};

export default MenuSideFlyout;
