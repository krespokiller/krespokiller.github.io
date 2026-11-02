/**
 * Player settings (accessibility + controls), persisted in localStorage.
 * Follows the Game Accessibility Guidelines (basic) and XAG 101/102/107/
 * 108/116/117/118: text size, contrast, remappable keys, hold/toggle fire,
 * difficulty, optional time limits, reduced motion and flashing.
 */
export type Difficulty = 'easy' | 'normal' | 'hard';
export type MotionPref = 'system' | 'on' | 'off';

export interface Settings {
  textSize: 'normal' | 'large';
  contrast: boolean;
  /** 'on' forces reduced motion & no flashing; 'off' ignores the OS setting. */
  motion: MotionPref;
  actKey: string;
  fireKey: string;
  fireMode: 'hold' | 'toggle';
  touchSize: 'normal' | 'large';
  difficulty: Difficulty;
  noTimeLimit: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  textSize: 'normal',
  contrast: false,
  motion: 'system',
  actKey: 'KeyE',
  fireKey: 'KeyJ',
  fireMode: 'hold',
  touchSize: 'normal',
  difficulty: 'normal',
  noTimeLimit: false,
};

/** Keys offered for remapping (code → label). */
export const KEY_CHOICES: { code: string; label: string }[] = [
  { code: 'KeyE', label: 'E' },
  { code: 'KeyF', label: 'F' },
  { code: 'KeyJ', label: 'J' },
  { code: 'KeyK', label: 'K' },
  { code: 'KeyQ', label: 'Q' },
  { code: 'ShiftLeft', label: 'Shift' },
  { code: 'ControlLeft', label: 'Ctrl' },
];

export const DIFFICULTY: Record<Difficulty, { speed: number; damage: number }> = {
  easy: { speed: 0.75, damage: 0.6 },
  normal: { speed: 1, damage: 1 },
  hard: { speed: 1.25, damage: 1.4 },
};

const KEY = 'settle-once-settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage unavailable: settings live for the session only
  }
}

export function effectiveReducedMotion(s: Settings, systemPrefers: boolean): boolean {
  return s.motion === 'system' ? systemPrefers : s.motion === 'on';
}
