// Player look and emotes. Clip and material names come from public/models/character.glb (blender/character.blend).

export const EMOTES = ["Wave", "Yes", "No", "RaiseHand", "Cheer", "Shrug"] as const;
export type Emote = (typeof EMOTES)[number];

/** Recolourable parts: key = material name in the model. `null` keeps the model's own colour. */
export type AvatarColors = { Shirt: string | null; Pants: string | null; Hair: string | null };
export type AvatarPart = keyof AvatarColors;

export const DEFAULT_AVATAR: AvatarColors = { Shirt: null, Pants: null, Hair: null };

export const PALETTE: Record<AvatarPart, string[]> = {
  Shirt: ["#1f7a4a", "#f2f2f0", "#2b3a55", "#b3342f", "#222428", "#e0b43c"],
  Pants: ["#3b5a85", "#222428", "#c8b89a", "#6b6f73", "#2f4a3a"],
  Hair: ["#1b1411", "#6b4226", "#d8b66a", "#8c3b22", "#d9d9d6"],
};

const STORAGE_KEY = "uib.avatar";

// Stored in the browser until the backend has a profile `avatar` field.
export function loadAvatar(): AvatarColors {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_AVATAR, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_AVATAR;
}

export function saveAvatar(colors: AvatarColors) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {}
}

/** Shared between the emote wheel (DOM) and the player (canvas). Mutated in place, read every frame. */
export const input = {
  wheelOpen: false,
  emote: null as Emote | null,
};
