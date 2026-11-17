/** Geometry of the Patrimonio line chart, kept apart from the markup so it can be tested. */

export interface ChartBox {
  width: number
  height: number
  left: number
  right: number
  top: number
  bottom: number
}

export interface ChartPoint {
  x: number
  y: number
}

const GUIDE_TARGET = 3

/** A 1, 2 or 5 times a power of ten close to `range / GUIDE_TARGET`, so the guides land on round amounts. */
function niceStep(range: number): number {
  const raw = range / GUIDE_TARGET
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return factor * magnitude
}

/** The round amounts the horizontal guides sit on, from the lowest up; they frame every value. */
export function guideValues(values: number[]): number[] {
  const low = Math.min(...values)
  const high = Math.max(...values)
  const pad = high === low ? Math.max(Math.abs(high) * 0.1, 1) : (high - low) * 0.12
  const step = niceStep(high - low + 2 * pad)
  const first = Math.floor((low - pad) / step)
  const last = Math.ceil((high + pad) / step)
  return Array.from({ length: last - first + 1 }, (_, index) => (first + index) * step)
}

/** The value range the chart shows: from the lowest guide to the highest. */
export function valueDomain(values: number[]): { min: number; max: number } {
  const guides = guideValues(values)
  return { min: guides[0], max: guides[guides.length - 1] }
}

const yOf = (value: number, domain: { min: number; max: number }, box: ChartBox) =>
  box.top + (box.height - box.top - box.bottom) * (1 - (value - domain.min) / (domain.max - domain.min))

/** One point per value, spread evenly left to right; a single value sits in the middle. */
export function chartPoints(values: number[], box: ChartBox): ChartPoint[] {
  const domain = valueDomain(values)
  const innerWidth = box.width - box.left - box.right
  return values.map((value, index) => ({
    x: box.left + (values.length === 1 ? innerWidth / 2 : (innerWidth * index) / (values.length - 1)),
    y: yOf(value, domain, box),
  }))
}

/** The horizontal guides with their height, over the same range as the points. */
export function guideLines(values: number[], box: ChartBox): { value: number; y: number }[] {
  const domain = valueDomain(values)
  return guideValues(values).map((value) => ({ value, y: yOf(value, domain, box) }))
}

/** An amount for an axis: $850, $9K, $1.65K, $2.4M. */
export function compactMoney(value: number): string {
  const sign = value < 0 ? '−' : ''
  const amount = Math.abs(value)
  const trim = (scaled: number) => String(Math.round(scaled * 100) / 100)
  if (amount >= 1_000_000) return `${sign}$${trim(amount / 1_000_000)}M`
  if (amount >= 1000) return `${sign}$${trim(amount / 1000)}K`
  return `${sign}$${trim(amount)}`
}

/** The indexes whose month label is drawn: the last one always, and no more than `limit` in all. */
export function labelledIndexes(count: number, limit: number): number[] {
  const every = Math.ceil(count / limit)
  return Array.from({ length: count }, (_, index) => index).filter((index) => (count - 1 - index) % every === 0)
}

/** The point an arrow key moves to; Home and End jump to the ends. Anything else stays where it is. */
export function steppedIndex(current: number, key: string, count: number): number {
  if (key === 'ArrowLeft') return Math.max(current - 1, 0)
  if (key === 'ArrowRight') return Math.min(current + 1, count - 1)
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return current
}
