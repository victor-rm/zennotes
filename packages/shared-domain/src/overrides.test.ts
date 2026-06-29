import { describe, it, expect } from 'vitest'
import { buildTweaksCss, isOverrideEnabled } from './overrides'

describe('buildTweaksCss', () => {
  it('renders set tokens as one :root[data-theme] block (hex → RGB triplets)', () => {
    const css = buildTweaksCss({ accent: '#ff3b30', blue: '#0a84ff' })
    expect(css).toContain(':root[data-theme] {')
    expect(css).toContain('--z-accent: 255 59 48;')
    expect(css).toContain('--z-blue: 10 132 255;')
  })

  it('skips unknown slugs + unparseable colors, and returns "" when empty', () => {
    expect(buildTweaksCss({})).toBe('')
    expect(buildTweaksCss(undefined)).toBe('')
    // `nope` is not a tweakable token; `accent` is unparseable → nothing valid.
    expect(buildTweaksCss({ nope: '#ffffff', accent: 'not-a-color' })).toBe('')
  })

  it('emits tokens in TWEAKABLE_TOKENS order regardless of input order', () => {
    const css = buildTweaksCss({ blue: '#000000', accent: '#ffffff' })
    expect(css.indexOf('--z-accent')).toBeLessThan(css.indexOf('--z-blue'))
  })

  it('renders length tweaks (unitless multipliers) and skips bad values', () => {
    expect(buildTweaksCss({ cornerRadius: '0' })).toContain('--z-radius-scale: 0;')
    expect(buildTweaksCss({ cornerRadius: '1.5' })).toContain('--z-radius-scale: 1.5;')
    expect(buildTweaksCss({ cornerRadius: 'big' })).toBe('')
  })

  it('expands a preset into its CSS vars; default/unknown emit nothing', () => {
    const css = buildTweaksCss({ density: 'comfortable' })
    expect(css).toContain('--z-tab-height: 48px;')
    expect(css).toContain('--z-tab-pad-x: 0.75rem;')
    expect(buildTweaksCss({ density: 'default' })).toBe('')
    expect(buildTweaksCss({ density: 'bogus' })).toBe('')
  })
})

describe('isOverrideEnabled', () => {
  it('treats a present non-off value as enabled', () => {
    expect(isOverrideEnabled({ 'a.css': 'on' }, 'a.css')).toBe(true)
    expect(isOverrideEnabled({ 'a.css': 'off' }, 'a.css')).toBe(false)
    expect(isOverrideEnabled({}, 'a.css')).toBe(false)
    expect(isOverrideEnabled(undefined, 'a.css')).toBe(false)
  })
})
