import { describe, expect, it } from 'vitest'
import type { RecurringPayment, RecurringPaymentOccurrence } from './api'
import { cancelledNotice, confirmedNotice, ruleNotice } from './notices'
import { allOccurrences, describeRule, dueText, resolved, ruleTitle, unresolved } from './presentation'

const occurrence = (id: number, dueDate: string, status: RecurringPaymentOccurrence['status']): RecurringPaymentOccurrence => ({
  id,
  recurringPaymentId: 4,
  dueDate,
  status,
  amount: '100.00',
  accountId: 3,
  categoryId: 1,
  enteredOn: dueDate.slice(0, 8) + '01',
  expenseId: null,
})

const rule = (patch: Partial<RecurringPayment> = {}): RecurringPayment => ({
  id: 4,
  description: 'Alquiler',
  amount: '100.00',
  accountId: 3,
  categoryId: 1,
  dayOfMonth: 5,
  startDate: '2026-10-01',
  status: 'active',
  occurrences: [],
  ...patch,
})

describe('describing rules', () => {
  it('names a rule by its description, else its Category', () => {
    expect(ruleTitle(rule())).toBe('Alquiler')
    expect(ruleTitle(rule({ description: '' }))).toBe('Vivienda')
  })

  it('says the Category, Account and day beside a description', () => {
    expect(describeRule(rule(), 'Cuenta corriente')).toEqual({
      title: 'Alquiler',
      details: 'Vivienda · Cuenta corriente · Día 5 de cada mes',
    })
    expect(describeRule(rule({ description: '' }), undefined).details).toBe('Día 5 de cada mes')
  })
})

describe('splitting occurrences', () => {
  const all = [
    occurrence(1, '2026-11-05', 'overdue'),
    occurrence(2, '2026-12-05', 'pending'),
    occurrence(3, '2026-10-05', 'confirmed'),
    occurrence(4, '2026-09-05', 'cancelled'),
  ]

  it('puts the oldest unresolved first so an overdue one is not missed', () => {
    expect(unresolved(all).map((item) => item.id)).toEqual([1, 2])
  })

  it('puts the latest resolved first', () => {
    expect(resolved(all).map((item) => item.id)).toEqual([3, 4])
  })

  it('shows each occurrence once', () => {
    const rules = [rule({ occurrences: [all[0]] }), rule({ id: 5, occurrences: [all[0], all[1]] })]
    expect(allOccurrences(rules).map((item) => item.id).sort()).toEqual([1, 2])
  })

  it('says when a reservation is due or was due', () => {
    expect(dueText({ dueDate: '2026-12-05', status: 'pending' })).toBe('Vence 5 dic 2026')
    expect(dueText({ dueDate: '2026-11-05', status: 'overdue' })).toBe('Venció 5 nov 2026')
  })
})

describe('notices', () => {
  it('confirms a rule change; deleting says the reservations are kept', () => {
    expect(ruleNotice('created', 'Alquiler', '500')).toBe('Creaste el pago recurrente Alquiler de $500.00.')
    expect(ruleNotice('deleted', 'Alquiler', '500')).toContain('se conservan')
  })

  it('names the new Balance after a confirmation', () => {
    expect(confirmedNotice('Alquiler', '120.00', { name: 'Cuenta corriente', balance: '880.00' })).toBe(
      'Confirmaste Alquiler: registraste un gasto de $120.00. Saldo de Cuenta corriente: $880.00.',
    )
  })

  it('says a cancellation registered no Expense', () => {
    expect(cancelledNotice('Alquiler', '100.00')).toContain('no se registró ningún gasto')
  })
})
