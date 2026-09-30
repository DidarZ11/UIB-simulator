"use client";

import { useEffect, useRef, useState } from "react";
import { ru } from "@/i18n/ru";
import { EMOTES, input } from "./avatar";

const KEY = "KeyT";
const SIZE = 300;
/** Mouse travel needed before a sector is picked. */
const DEAD_ZONE = 25;

/** Hold T, move the mouse towards an emote, release T to play it. */
export function EmoteWheel() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const aim = useRef({ x: 0, y: 0 });
  const pickedRef = useRef<number | null>(null);

  useEffect(() => {
    const choose = (i: number | null) => {
      pickedRef.current = i;
      setPicked(i);
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== KEY || e.repeat) return;
      aim.current = { x: 0, y: 0 };
      choose(null);
      input.wheelOpen = true;
      setOpen(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== KEY || !input.wheelOpen) return;
      input.wheelOpen = false;
      setOpen(false);
      if (pickedRef.current !== null) input.emote = EMOTES[pickedRef.current];
    };
    const move = (e: MouseEvent) => {
      if (!input.wheelOpen) return;
      const a = aim.current;
      a.x += e.movementX;
      a.y += e.movementY;
      const len = Math.hypot(a.x, a.y);
      if (len > 100) {
        a.x = (a.x / len) * 100;
        a.y = (a.y / len) * 100;
      }
      if (len < DEAD_ZONE) return choose(null);
      // Sector 0 is at the top, going clockwise.
      const angle = (Math.atan2(a.x, -a.y) + 2 * Math.PI) % (2 * Math.PI);
      choose(Math.round(angle / ((2 * Math.PI) / EMOTES.length)) % EMOTES.length);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
      input.wheelOpen = false;
    };
  }, []);

  if (!open) return null;
  const r = SIZE * 0.36;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative rounded-full bg-black/55" style={{ width: SIZE, height: SIZE }}>
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
          {ru.emotes.title}
        </div>
        {EMOTES.map((emote, i) => {
          const angle = (i / EMOTES.length) * 2 * Math.PI;
          return (
            <div
              key={emote}
              className={`absolute w-24 -translate-x-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-center text-sm font-semibold ${
                picked === i ? "bg-[#1f7a4a] text-white" : "text-white/90"
              }`}
              style={{ left: SIZE / 2 + Math.sin(angle) * r, top: SIZE / 2 - Math.cos(angle) * r }}
            >
              {ru.emotes[emote]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
