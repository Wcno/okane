import { CarFront, Shapes, Tag } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { iconOf, toneOf } from './appearance'

const KEYS = ['housing', 'food', 'transport', 'utilities', 'health', 'entertainment', 'education']

describe('toneOf', () => {
  it('keeps one hue for each of the seven initial Categories', () => {
    expect(KEYS.map(toneOf)).toEqual([1, 2, 3, 4, 5, 6, 7].map((hue) => `var(--cat-${hue})`))
  })

  it('gives "Otros" and every Category without a key the neutral tone', () => {
    expect([toneOf('other'), toneOf(null), toneOf('unknown')]).toEqual(['var(--cat-0)', 'var(--cat-0)', 'var(--cat-0)'])
  })
})

describe('iconOf', () => {
  it('keeps the icon of the initial Categories and tags the rest', () => {
    expect(iconOf('transport')).toBe(CarFront)
    expect(iconOf('other')).toBe(Shapes)
    expect(iconOf(null)).toBe(Tag)
  })
})
