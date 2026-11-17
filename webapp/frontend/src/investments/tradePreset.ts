import type { Position, Asset } from './api'

/** What a link into the trade form already chose: the Asset and, when one holds it, its Account. */
export interface TradePreset {
  asset: Asset
  accountId: number | null
}

export interface PresetState {
  preset: TradePreset
}

/** The sale of a Position: its Asset, and its Account when only one holds it. */
export const sellPresetOf = (position: Position): PresetState => ({
  preset: {
    asset: position.asset,
    accountId: position.accounts.length === 1 ? position.accounts[0].accountId : null,
  },
})

const isAsset = (value: unknown): value is Asset =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Asset).id === 'number' &&
  typeof (value as Asset).symbol === 'string'

/** The preset a navigation carried, or null when it carried none. */
export function presetFrom(state: unknown): TradePreset | null {
  if (typeof state !== 'object' || state === null) return null
  const { preset } = state as Partial<PresetState>
  if (typeof preset !== 'object' || preset === null || !isAsset(preset.asset)) return null
  return { asset: preset.asset, accountId: typeof preset.accountId === 'number' ? preset.accountId : null }
}
