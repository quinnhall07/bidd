"use client";
// motion=on: switching campus sweeps the new campus color down the page once, then gets out of the way
// (DESIGN.md: "Choosing a campus repaints every campus fill on the page in one sweep").
import { useEffect, useRef, useState } from "react";

export function RepaintSweep({ school }: { school: string }) {
  const previous = useRef(school);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (previous.current === school) return;
    previous.current = school;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRun((n) => n + 1);
  }, [school]);
  if (!run) return null;
  return <div key={run} aria-hidden="true" className="repaint-sweep pointer-events-none fixed inset-0 z-40" />;
}
