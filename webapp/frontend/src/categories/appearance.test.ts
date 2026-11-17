import { CarFront, Shapes, Tag } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { iconOf, toneOf } from './appearance'

describe('toneOf', () => {
  it('keeps one hue for each of the first seven Categories', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(toneOf)).toEqual([1, 2, 3, 4, 5, 6, 7].map((id) => `var(--cat-${id})`))
  })

  it('gives "Otros" and every Category beyond the seven hues the neutral tone', () => {
    expect([8, 9, 40].map(toneOf)).toEqual(['var(--cat-0)', 'var(--cat-0)', 'var(--cat-0)'])
  })
})

describe('iconOf', () => {
  it('keeps the icon of the initial Categories and tags the rest', () => {
    expect(iconOf(3)).toBe(CarFront)
    expect(iconOf(8)).toBe(Shapes)
    expect(iconOf(9)).toBe(Tag)
  })
})
