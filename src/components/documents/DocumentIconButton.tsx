import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import "./documentIcons.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { title: string; as?: "button" | "span"; wrapperClassName?: string };

/** Shared document action styling; portal keeps labels clear of scrolling panels. */
export function DocumentIconButton({ title, as = "button", children, className = "", wrapperClassName = "", ...props }: Props) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const visible = position !== null;
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => setPosition(null);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [visible]);
  const show = () => {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const above = rect.bottom + 48 > window.innerHeight;
    setPosition({ left: Math.max(100, Math.min(window.innerWidth - 100, rect.left + rect.width / 2)), top: above ? rect.top - 8 : rect.bottom + 8, above });
  };
  const hide = () => setPosition(null);
  const classes = `document-icon-button ${className}`;
  return <span ref={anchor} className={`document-icon-anchor ${wrapperClassName}`} onMouseEnter={show} onMouseLeave={hide} onFocusCapture={show} onBlurCapture={hide} onClickCapture={hide}>
    {as === "span" ? <span className={classes} aria-label={title} aria-describedby={position ? id : undefined}>{children}</span>
      : <button {...props} type={props.type || "button"} className={classes} aria-label={props["aria-label"] || title} aria-describedby={position ? id : undefined}>{children}</button>}
    {position && createPortal(<span id={id} role="tooltip" className="document-icon-tooltip" style={{ left: position.left, top: position.top, transform: position.above ? "translate(-50%, -100%)" : "translateX(-50%)" }}>{title}</span>, document.body)}
  </span>;
}
