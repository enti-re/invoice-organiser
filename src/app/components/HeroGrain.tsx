"use client";

import { useEffect, useState } from "react";
import { Noise, useNoiseConfig } from "react-noise";
import "react-noise/css";

const NOISE_KEY = "hero-grain";

export const HeroGrain = () => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia only exists client-side; this is a one-time read on mount, not a synchronization loop
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useNoiseConfig({ key: NOISE_KEY, color: "255 255 255", opacity: 0.08 }, []);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Noise noiseKey={NOISE_KEY} isAnimated={!reduceMotion} className="h-full w-full" />
    </div>
  );
};
