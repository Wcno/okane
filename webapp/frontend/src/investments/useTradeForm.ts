import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Account } from '../accounts/api'
import { useFieldErrors } from '../lib/fieldErrors'
import type { Outcome } from '../lib/http'
import { useSubmission } from '../lib/useSubmission'
import type { Asset, Trade, TradeErrors, TradeField, TradeInput } from './api'
import { validateTrade, type TradeDraft } from './form'

/** The draft fields each api-service field is shown on. */
const fieldsOf = (patch: Partial<TradeDraft>): TradeField[] => {
  const fields: TradeField[] = []
  if ('accountId' in patch) fields.push('accountId', 'date')
  if ('asset' in patch) fields.push('assetId')
  if ('units' in patch) fields.push('units')
  if ('unitPrice' in patch) fields.push('unitPrice', 'units')
  if ('date' in patch) fields.push('date')
  return fields
}

/**
 * The state of the form that records a purchase or a sale: the draft, what is
 * wrong with it and the submit. Validation runs in the browser first;
 * api-service has the last word, and its errors land on the same fields.
 */
export function useTradeForm({
  initial,
  accounts,
  save,
  onSaved,
}: {
  initial: TradeDraft
  accounts: Account[]
  save: (trade: TradeInput) => Promise<Outcome<Trade, TradeField>>
  /** `asset` is the one the User chose, which the saved record only refers to by id. */
  onSaved: (trade: Trade, asset: Asset) => void | Promise<void>
}) {
  const { isSubmitting, submit: write } = useSubmission()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(initial)
  const { errors, setErrors, clearErrors } = useFieldErrors<TradeField>()
  const [attention, setAttention] = useState(0)

  // After the errors are on screen, the keyboard goes to the first field that needs a fix.
  useEffect(() => {
    if (attention > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attention])

  const showErrors = (found: TradeErrors) => {
    setErrors(found)
    setAttention((count) => count + 1)
  }

  const change = (patch: Partial<TradeDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }))
    clearErrors(...fieldsOf(patch))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const checked = validateTrade(draft, { accounts })
    if (!checked.ok) {
      showErrors(checked.errors)
      return
    }
    setErrors({})
    const outcome = await write(() => save(checked.trade), (trade) => onSaved(trade, checked.asset))
    if (outcome && !outcome.ok) showErrors(outcome.errors)
  }

  return { form, draft, change, errors, isSubmitting, submit }
}
