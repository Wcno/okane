import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentAccount } from '../accounts/api'
import type { ScreenNotice } from '../lib/notice'
import type { Asset, Trade } from './api'
import { transactionsBack, tradeNotice, type TradeChange } from './presentation'

/**
 * What a correction or a deletion of a Transacción de inversión ends with: go
 * back to the list with a notice that names the Account's new Balance.
 */
export function useAfterTradeChange() {
  const navigate = useNavigate()
  return useCallback(
    async (change: TradeChange, trade: Pick<Trade, 'type' | 'units' | 'cashAmount' | 'accountId'>, asset: Pick<Asset, 'symbol'>) => {
      const account = await currentAccount(trade.accountId)
      const state: ScreenNotice = { notice: tradeNotice(change, trade, asset, account) }
      navigate(transactionsBack.to, { state })
    },
    [navigate],
  )
}
