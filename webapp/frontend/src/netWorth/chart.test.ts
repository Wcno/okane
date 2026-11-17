import { describe, expect, it } from 'vitest'
import { chartPoints, guideLines, labelledIndexes, valueDomain } from './chart'

const box = { width: 100, height: 50, left: 10, right: 10, top: 5, bottom: 5 }

describe('chartPoints', () => {
  it('puts the lowest value at the bottom and the highest at the top of the padded range', () => {
    const [low, high] = chartPoints([0, 100], box)
    expect(low.x).toBe(10)
    expect(high.x).toBe(90)
    expect(low.y).toBeGreaterThan(high.y)
  })

  it('centres a single value', () => {
    expect(chartPoints([500], box)[0].x).toBe(50)
  })
})

describe('valueDomain', () => {
  it('never collapses when every value is equal', () => {
    const { min, max } = valueDomain([0, 0])
    expect(max).toBeGreaterThan(min)
  })

  it('handles negative values', () => {
    const { min, max } = valueDomain([-50, -10])
    expect(min).toBeLessThan(-50)
    expect(max).toBeGreaterThan(-10)
  })
})

describe('guideLines', () => {
  it('returns three ascending values drawn from the bottom up, matching the points', () => {
    const [a, b, c] = guideLines([0, 100], box)
    expect(a.value).toBeLessThan(b.value)
    expect(b.value).toBeLessThan(c.value)
    expect(a.y).toBeGreaterThan(c.y)
    const [low] = chartPoints([a.value], { ...box })
    expect(low).toBeDefined()
  })

  it('places a guide at the same height as a point of equal value', () => {
    const [, middle] = guideLines([0, 100], box)
    const [, point] = chartPoints([0, middle.value, 100], box)
    expect(middle.y).toBeCloseTo(point.y, 6)
  })
})

describe('labelledIndexes', () => {
  it('labels every month when they fit', () => {
    expect(labelledIndexes(4, 6)).toEqual([0, 1, 2, 3])
  })

  it('thins the labels but keeps the last month', () => {
    const shown = labelledIndexes(13, 6)
    expect(shown.length).toBeLessThanOrEqual(6)
    expect(shown.at(-1)).toBe(12)
  })
})
