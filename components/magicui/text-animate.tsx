"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";

// ponytail: TextAnimate versi CSS. Proyek ini tidak pakai framer-motion (lihat
// animated-theme-toggler.tsx yang juga ditulis tangan), jadi animasinya keyframe
// di globals.css + animation-delay bertingkat. Ceiling: hanya varian blurInUp &
// fadeIn, tanpa startOnView/exit. Pasang `motion` + komponen magicui asli kalau
// nanti butuh varian lain atau animasi keluar.
type Animation = "blurInUp" | "fadeIn";
type As = "p" | "span" | "div" | "h1" | "h2" | "h3";

const KEYFRAMES: Record<Animation, string> = {
  blurInUp: "ta-blur-in-up",
  fadeIn: "ta-fade-in",
};

export function TextAnimate({
  children,
  className,
  segmentClassName,
  as: Tag = "p",
  by = "word",
  animation = "fadeIn",
  delay = 0,
  duration = 0.3,
  stagger = 0.025,
}: {
  children: string;
  className?: string;
  segmentClassName?: string;
  as?: As;
  by?: "word" | "character";
  animation?: Animation;
  delay?: number;
  duration?: number;
  stagger?: number;
}) {
  const words = children.split(" ");
  let n = 0;

  return (
    // Teks utuh dibaca pembaca layar; potongannya disembunyikan.
    <Tag className={className} aria-label={children}>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          {wi > 0 && " "}
          {/* Kata dibungkus inline-block supaya baris tidak patah di tengah kata. */}
          <span className="inline-block" aria-hidden>
            {(by === "character" ? [...word] : [word]).map((seg, si) => (
              <span
                key={si}
                className={cn("ta-seg", segmentClassName)}
                style={{
                  animationName: KEYFRAMES[animation],
                  animationDelay: `${delay + n++ * stagger}s`,
                  animationDuration: `${duration}s`,
                }}
              >
                {seg}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
