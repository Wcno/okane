import { describe, expect, it } from 'vitest'
import type { Asset, Position } from './api'
import { presetFrom, sellPresetOf } from './tradePreset'

const asset: Asset = {
  id: 7,
  provider: 'sample',
  market: 'XNAS',
  symbol: 'AAPL',
  name: 'Apple',
  assetType: 'stock',
  currency: 'USD',
}

const held = (accountIds: number[]) =>
  ({
    asset,
    accounts: accountIds.map((accountId) => ({ accountId })),
  }) as Position

describe('trade preset', () => {
  it('carries the Asset and the only Account that holds it', () => {
    expect(presetFrom(sellPresetOf(held([3])))).toEqual({ asset, accountId: 3 })
  })

  it('leaves the Account to the User when several hold the Asset', () => {
    expect(presetFrom(sellPresetOf(held([3, 4])))).toEqual({ asset, accountId: null })
  })

  it('ignores a navigation that carried no preset', () => {
    expect(presetFrom(null)).toBeNull()
    expect(presetFrom({ notice: 'hola' })).toBeNull()
    expect(presetFrom({ preset: { asset: { id: 'x' } } })).toBeNull()
  })
})
