"use client";

import { useState } from "react";
import { ru } from "@/i18n/ru";
import { DEFAULT_AVATAR, PALETTE, type AvatarColors, type AvatarPart } from "./avatar";

const PARTS: AvatarPart[] = ["Shirt", "Pants", "Hair"];

/** Trial of outfit colours. The full character editor comes later (see PROJECT.md). */
export function AvatarPanel({ colors, onChange }: { colors: AvatarColors; onChange: (c: AvatarColors) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute right-4 top-4 text-white">
      <button
        className="rounded-lg bg-black/60 px-4 py-2 text-sm font-semibold hover:bg-black/75"
        onClick={() => setOpen(!open)}
      >
        {ru.avatar.button}
      </button>
      {open && (
        <div className="mt-2 w-64 space-y-3 rounded-lg bg-black/70 p-4">
          {PARTS.map((part) => (
            <div key={part}>
              <div className="mb-1 text-xs uppercase tracking-wide text-white/70">{ru.avatar[part]}</div>
              <div className="flex flex-wrap gap-2">
                <Swatch
                  title={ru.avatar.original}
                  active={colors[part] === null}
                  onClick={() => onChange({ ...colors, [part]: null })}
                />
                {PALETTE[part].map((c) => (
                  <Swatch key={c} color={c} active={colors[part] === c} onClick={() => onChange({ ...colors, [part]: c })} />
                ))}
              </div>
            </div>
          ))}
          <button className="text-xs text-white/70 underline" onClick={() => onChange(DEFAULT_AVATAR)}>
            {ru.avatar.reset}
          </button>
        </div>
      )}
    </div>
  );
}

function Swatch({ color, title, active, onClick }: { color?: string; title?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`h-7 w-7 rounded-full border-2 ${active ? "border-white" : "border-white/20"}`}
      style={{ background: color ?? "repeating-linear-gradient(45deg,#888 0 4px,#bbb 4px 8px)" }}
    />
  );
}
