import { describe, expect, it } from 'vitest'
import { chartPoints, compactMoney, guideLines, guideValues, labelledIndexes, steppedIndex, valueDomain } from './chart'

const box = { width: 100, height: 50, left: 10, right: 10, top: 5, bottom: 5 }

describe('chartPoints', () => {
  it('puts the lowest value below the highest and spreads them left to right', () => {
    const [low, high] = chartPoints([0, 100], box)
    expect(low.x).toBe(10)
    expect(high.x).toBe(90)
    expect(low.y).toBeGreaterThan(high.y)
  })

  it('centres a single value', () => {
    expect(chartPoints([500], box)[0].x).toBe(50)
  })

  it('keeps every point inside the plot', () => {
    for (const point of chartPoints([1700, 1750, 1200], box)) {
      expect(point.y).toBeGreaterThanOrEqual(box.top)
      expect(point.y).toBeLessThanOrEqual(box.height - box.bottom)
    }
  })
})

describe('valueDomain', () => {
  it('never collapses when every value is equal', () => {
    const { min, max } = valueDomain([0, 0])
    expect(max).toBeGreaterThan(min)
  })

  it('frames negative values', () => {
    const { min, max } = valueDomain([-50, -10])
    expect(min).toBeLessThanOrEqual(-50)
    expect(max).toBeGreaterThanOrEqual(-10)
  })
})

describe('guideValues', () => {
  it('lands on round ascending amounts', () => {
    expect(guideValues([1500, 1750])).toEqual([1400, 1600, 1800])
  })
})

describe('guideLines', () => {
  it('draws the lowest guide at the bottom', () => {
    const lines = guideLines([0, 100], box)
    expect(lines[0].y).toBeGreaterThan(lines[lines.length - 1].y)
  })

  it('places a guide at the same height as a point of equal value', () => {
    const lines = guideLines([0, 100], box)
    const middle = lines[Math.floor(lines.length / 2)]
    const [, point] = chartPoints([0, middle.value, 100], box)
    expect(middle.y).toBeCloseTo(point.y, 6)
  })
})

describe('compactMoney', () => {
  it('shortens thousands and millions and keeps small amounts whole', () => {
    expect(compactMoney(9000)).toBe('$9K')
    expect(compactMoney(1650)).toBe('$1.65K')
    expect(compactMoney(2_400_000)).toBe('$2.4M')
    expect(compactMoney(850)).toBe('$850')
    expect(compactMoney(0)).toBe('$0')
    expect(compactMoney(-1500)).toBe('−$1.5K')
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

describe('steppedIndex', () => {
  it('moves with the arrows and stops at the ends', () => {
    expect(steppedIndex(2, 'ArrowLeft', 5)).toBe(1)
    expect(steppedIndex(0, 'ArrowLeft', 5)).toBe(0)
    expect(steppedIndex(2, 'ArrowRight', 5)).toBe(3)
    expect(steppedIndex(4, 'ArrowRight', 5)).toBe(4)
  })

  it('jumps to the ends with Home and End and ignores other keys', () => {
    expect(steppedIndex(2, 'Home', 5)).toBe(0)
    expect(steppedIndex(2, 'End', 5)).toBe(4)
    expect(steppedIndex(2, 'a', 5)).toBe(2)
  })
})
