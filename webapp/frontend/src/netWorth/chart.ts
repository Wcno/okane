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

/** The value range the chart shows, padded so the line never touches the edges and is never flat. */
export function valueDomain(values: number[]): { min: number; max: number } {
  const low = Math.min(...values)
  const high = Math.max(...values)
  const pad = high === low ? Math.max(Math.abs(high) * 0.1, 1) : (high - low) * 0.12
  return { min: low - pad, max: high + pad }
}

/** One point per value, spread evenly left to right; a single value sits in the middle. */
export function chartPoints(values: number[], box: ChartBox): ChartPoint[] {
  const { min, max } = valueDomain(values)
  const innerWidth = box.width - box.left - box.right
  const innerHeight = box.height - box.top - box.bottom
  return values.map((value, index) => ({
    x: box.left + (values.length === 1 ? innerWidth / 2 : (innerWidth * index) / (values.length - 1)),
    y: box.top + innerHeight * (1 - (value - min) / (max - min)),
  }))
}

/** Three evenly spaced horizontal guides over the same range as the points, from the lowest up. */
export function guideLines(values: number[], box: ChartBox): { value: number; y: number }[] {
  const { min, max } = valueDomain(values)
  const innerHeight = box.height - box.top - box.bottom
  return [0, 1, 2].map((step) => {
    const value = min + ((max - min) * step) / 2
    return {
      value,
      y: box.top + innerHeight * (1 - (value - min) / (max - min)),
    }
  })
}

/** The indexes whose month label is drawn: the last one always, and no more than `limit` in all. */
export function labelledIndexes(count: number, limit: number): number[] {
  const every = Math.ceil(count / limit)
  return Array.from({ length: count }, (_, index) => index).filter((index) => (count - 1 - index) % every === 0)
}
