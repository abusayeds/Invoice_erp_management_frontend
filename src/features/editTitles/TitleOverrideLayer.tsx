/**
 * Applies Edit Titles overrides to the whole website without touching any
 * page: a MutationObserver swaps text nodes (and placeholder / title /
 * aria-label attributes) whose trimmed text exactly equals a title's original
 * text. Originals are remembered per node, so changing or resetting a title
 * re-renders correctly and React updates are picked up as new originals.
 *
 * Never touches form values (inputs/textareas), contenteditable areas, or
 * anything inside `[data-no-title-override]`.
 *
 * Only company logins load overrides — the backend's /edit-titles/my is
 * company-only and returns the caller's own titles.
 */
import React, { useEffect } from "react";
import useAuth from "@/hooks/useAuth";
import {
  clearTitleOverrides,
  getTitleOverrides,
  refreshTitleOverrides,
  subscribeTitleOverrides,
} from "./titleOverrides";

const ATTRS = ["placeholder", "title", "aria-label"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"]);
const SKIP_SELECTOR =
  "[data-no-title-override], [contenteditable=''], [contenteditable='true'], textarea, script, style, noscript";

type Rec = { orig: string; written: string };

function createApplier() {
  let map = new Map<string, string>();
  let applied = false; // something was ever swapped → must scan to restore
  const textRecs = new WeakMap<Text, Rec>();
  const attrRecs = new WeakMap<Element, Map<string, Rec>>();

  const translate = (s: string): string | null => {
    const trimmed = s.trim();
    if (!trimmed) return null;
    const value = map.get(trimmed);
    if (value === undefined) return null;
    const start = s.indexOf(trimmed);
    return s.slice(0, start) + value + s.slice(start + trimmed.length);
  };

  /** Shared swap/restore for one text value; returns the value to write or null. */
  const resolve = (cur: string, rec: Rec | undefined) => {
    // Our own previous write → keep the remembered original; anything else is a fresh original.
    const orig = rec && cur === rec.written ? rec.orig : cur;
    const target = translate(orig);
    return { orig, target };
  };

  const processText = (node: Text) => {
    const cur = node.nodeValue ?? "";
    const rec = textRecs.get(node);
    const { orig, target } = resolve(cur, rec);
    if (target !== null) {
      if (cur !== target) node.nodeValue = target;
      textRecs.set(node, { orig, written: target });
      applied = true;
    } else if (rec) {
      if (cur === rec.written) node.nodeValue = orig;
      textRecs.delete(node);
    }
  };

  const processAttr = (el: Element, attr: string) => {
    const cur = el.getAttribute(attr);
    let recs = attrRecs.get(el);
    const rec = recs?.get(attr);
    if (cur === null) {
      recs?.delete(attr);
      return;
    }
    const { orig, target } = resolve(cur, rec);
    if (target !== null) {
      if (cur !== target) el.setAttribute(attr, target);
      if (!recs) attrRecs.set(el, (recs = new Map()));
      recs.set(attr, { orig, written: target });
      applied = true;
    } else if (rec) {
      if (cur === rec.written) el.setAttribute(attr, orig);
      recs!.delete(attr);
    }
  };

  const processAttrs = (el: Element) => {
    for (const a of ATTRS) if (el.hasAttribute(a) || attrRecs.get(el)?.has(a)) processAttr(el, a);
  };

  const isSkippedEl = (el: Element) =>
    SKIP_TAGS.has(el.tagName) ||
    el.hasAttribute("data-no-title-override") ||
    (el as HTMLElement).isContentEditable;

  const scan = (root: Node) => {
    if (root.nodeType === Node.TEXT_NODE) {
      if (!root.parentElement?.closest(SKIP_SELECTOR)) processText(root as Text);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const rootEl = root as Element;
    if (rootEl.closest(SKIP_SELECTOR)) return;
    processAttrs(rootEl);
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
        const el = n as Element;
        if (isSkippedEl(el)) return NodeFilter.FILTER_REJECT; // skip the whole subtree
        processAttrs(el);
        return NodeFilter.FILTER_SKIP; // keep descending
      },
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) processText(n as Text);
  };

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") {
        scan(r.target);
      } else if (r.type === "attributes") {
        const el = r.target as Element;
        if (!el.closest(SKIP_SELECTOR)) processAttr(el, r.attributeName!);
      } else {
        r.addedNodes.forEach(scan);
      }
    }
  });

  let observing = false;
  const start = () => {
    if (observing) return;
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });
    observing = true;
  };

  return {
    setMap(next: Map<string, string>) {
      map = next;
      if (map.size === 0 && !applied) return; // nothing to add or restore
      start();
      scan(document.body); // apply new values and restore removed ones
    },
    destroy() {
      observer.disconnect();
    },
  };
}

export const TitleOverrideLayer: React.FC = () => {
  const { user } = useAuth();
  const isCompany = user?.role === "company";

  useEffect(() => {
    const applier = createApplier();
    applier.setMap(getTitleOverrides());
    const unsubscribe = subscribeTitleOverrides((m) => applier.setMap(m));
    return () => {
      unsubscribe();
      applier.destroy();
    };
  }, []);

  useEffect(() => {
    if (isCompany) void refreshTitleOverrides();
    else clearTitleOverrides();
  }, [isCompany, user?.id]);

  return null;
};

export default TitleOverrideLayer;
