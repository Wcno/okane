/** Fixed hue per scenario position, never per rank: the validated categorical order. */
export const scenarioTone = (position: number) => `var(--cat-${position + 1})`

export const scenarioName = (position: number) => `Escenario ${position + 1}`
