"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * The Heatmap sizes its Squares from the width it is given, which is what lets
 * one component serve day one at 40px, a phone at 5.4px and a desktop at 12px.
 * Width therefore has to be measured, not assumed.
 */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured != null) setWidth(measured);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
