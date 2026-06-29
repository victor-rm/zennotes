/**
 * CSS overrides — small user-authored `.css` files in
 * `~/.config/zennotes/overrides/` that the user toggles on/off and that layer on
 * top of *whichever* theme is active (built-in or custom). The enabled set is
 * persisted as a portable config map (`[overrides]` in config.toml).
 *
 * To override a theme token from a override, target `:root[data-theme] { … }` —
 * overrides are injected last, so that selector wins over both a built-in's
 * `:root[data-theme="…"]` block and a custom theme's `:root {}`.
 */

export interface Override {
  /** Filename including `.css`, e.g. `punchy-accent.css`. Stable id. */
  name: string
  /** Raw CSS text, injected verbatim when enabled. */
  css: string
  /** Set when the file couldn't be read; surfaced in the UI. */
  error?: string
}

/**
 * Whether a override is enabled, per the persisted `[overrides]` map. Only enabled
 * overrides are stored (`"name.css" = "on"`); a missing key means off. Tolerant
 * of a hand-edited config that wrote an explicit off-ish value.
 */
export function isOverrideEnabled(
  enabled: Record<string, string> | undefined,
  name: string
): boolean {
  const v = enabled?.[name]
  return v !== undefined && v !== 'off' && v !== 'false' && v !== '0' && v !== ''
}

/**
 * Visual tweaks — the no-code companion to overrides. A small UI lets users
 * recolor individual `--z-*` tokens with a color picker; the picks are stored
 * as a `slug → color` map (portable config `[tweaks]`) and rendered to a single
 * `:root[data-theme]` block, injected after overrides so an explicit pick wins.
 *
 * Only direct-set, readability-safe tokens are exposed here. Backgrounds/text
 * have derived scales and belong to a full custom theme, not a one-token tweak.
 */
import { parseColor } from './custom-themes'

export type TweakKind = 'color' | 'length' | 'preset'

export interface TweakableToken {
  /** Stable key stored in config (e.g. "accent"). */
  slug: string
  /** The `--z-*` custom property this controls. */
  token: string
  /** Short UI label. */
  label: string
  /** Grouping for the UI. */
  group: 'accent' | 'syntax' | 'layout'
  /** How the value is stored + rendered. Defaults to `color` (a swatch). */
  kind?: TweakKind
  /** `length` only: slider bounds, unit, and the default (= the CSS `:root` value). */
  min?: number
  max?: number
  step?: number
  /** CSS unit appended to the emitted value; '' for a unitless multiplier. */
  unit?: string
  /** UI-only suffix for the displayed value (defaults to `unit`). */
  displaySuffix?: string
  fallback?: number
  /** `preset` only: the segmented options, and the CSS vars each value sets
   *  (a value with no entry — e.g. "default" — emits nothing → CSS defaults). */
  options?: { value: string; label: string }[]
  presets?: Record<string, Record<string, string>>
}

/** The tokens the visual tweak UI exposes, in display order. */
export const TWEAKABLE_TOKENS: TweakableToken[] = [
  { slug: 'accent', token: '--z-accent', label: 'Accent', group: 'accent', kind: 'color' },
  { slug: 'red', token: '--z-red', label: 'Red', group: 'syntax', kind: 'color' },
  { slug: 'green', token: '--z-green', label: 'Green', group: 'syntax', kind: 'color' },
  { slug: 'yellow', token: '--z-yellow', label: 'Yellow', group: 'syntax', kind: 'color' },
  { slug: 'blue', token: '--z-blue', label: 'Blue', group: 'syntax', kind: 'color' },
  { slug: 'purple', token: '--z-purple', label: 'Purple', group: 'syntax', kind: 'color' },
  { slug: 'aqua', token: '--z-aqua', label: 'Aqua', group: 'syntax', kind: 'color' },
  {
    // Tab density preset — each option sets tab height + horizontal padding
    // together so tabs look deliberately tighter/roomier, not just padded.
    slug: 'density',
    token: '',
    label: 'Tab density',
    group: 'layout',
    kind: 'preset',
    options: [
      { value: 'compact', label: 'Compact' },
      { value: 'default', label: 'Default' },
      { value: 'comfortable', label: 'Comfortable' }
    ],
    presets: {
      compact: { '--z-tab-height': '32px', '--z-tab-pad-x': '0.375rem' },
      comfortable: { '--z-tab-height': '48px', '--z-tab-pad-x': '0.75rem' }
    }
  },
  {
    // Global radius multiplier: 0 = square, 1 = theme default, up to 2× rounder.
    // Pills/circles use `rounded-full`, which stays round regardless.
    slug: 'cornerRadius',
    token: '--z-radius-scale',
    label: 'Corner radius',
    group: 'layout',
    kind: 'length',
    min: 0,
    max: 2,
    step: 0.05,
    unit: '',
    displaySuffix: '×',
    fallback: 1
  }
]

/**
 * Render the visual-tweak map into a single `:root[data-theme]` block.
 * Colors → RGB triplet; lengths → `<n><unit>`; toggles → their `onValue` when
 * on. Unknown/invalid entries are skipped; returns '' when nothing is set.
 */
export function buildTweaksCss(tweaks: Record<string, string> | undefined): string {
  if (!tweaks) return ''
  const decls: string[] = []
  for (const t of TWEAKABLE_TOKENS) {
    const raw = tweaks[t.slug]
    if (raw == null || raw === '') continue
    if (t.kind === 'preset') {
      const vars = t.presets?.[raw]
      if (vars) {
        for (const [cssVar, value] of Object.entries(vars)) decls.push(`  ${cssVar}: ${value};`)
      }
    } else if (t.kind === 'length') {
      const n = Number(raw)
      if (Number.isFinite(n)) decls.push(`  ${t.token}: ${n}${t.unit ?? 'px'};`)
    } else {
      const rgb = parseColor(raw)
      if (rgb) decls.push(`  ${t.token}: ${rgb.join(' ')};`)
    }
  }
  return decls.length ? `:root[data-theme] {\n${decls.join('\n')}\n}\n` : ''
}
