import { describe, expect, it } from 'vitest'
import { defaultDraft, percentToRatio, ratioToPercent, validateScenarios } from './projectionForm'

describe('percentToRatio', () => {
  it.each([
    ['12', '0.12'],
    ['12.5', '0.125'],
    ['0', '0'],
    ['100', '1'],
    ['-12', '-0.12'],
    ['0.0001', '0.000001'],
    ['1199.99', '11.9999'],
  ])('writes %s %% as the ratio %s without rounding', (percent, ratio) => {
    expect(percentToRatio(percent)).toBe(ratio)
  })

  it.each(['', 'abc', '1,5', '1.23456', '--1'])('refuses %j', (text) => {
    expect(percentToRatio(text)).toBeNull()
  })
})

describe('ratioToPercent', () => {
  it('shows a saved ratio as the percentage the field takes', () => {
    expect(ratioToPercent('0.042500')).toBe('4.25')
    expect(ratioToPercent('0.000000')).toBe('0')
    expect(ratioToPercent('1.000000')).toBe('100')
  })
})

describe('validateScenarios', () => {
  it('turns the defaults into a scenario that starts from the selection', () => {
    expect(validateScenarios([defaultDraft()], 'savings')).toEqual({
      ok: true,
      scenarios: [{ initialCapital: null, monthlyContribution: '0', months: 12, annualRate: '0' }],
    })
  })

  it('sends the rate as a ratio and keeps an explicit capital', () => {
    const draft = { capital: '1000', contribution: '100.50', months: '1', ratePercent: '12' }

    expect(validateScenarios([draft], 'investment')).toEqual({
      ok: true,
      scenarios: [{ initialCapital: '1000', monthlyContribution: '100.50', months: 1, annualRate: '0.12' }],
    })
  })

  it('reports each wrong field of each scenario by position', () => {
    const wrong = { capital: '-5', contribution: '1.234', months: '0', ratePercent: 'x' }

    const outcome = validateScenarios([defaultDraft(), wrong], 'investment')

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(Object.keys(outcome.errors).sort()).toEqual([
        'scenarios.1.annual_rate',
        'scenarios.1.initial_capital',
        'scenarios.1.monthly_contribution',
        'scenarios.1.months',
      ])
    }
  })

  it('rejects a negative rate for savings and one of -1200 % or less for an investment', () => {
    const negative = { ...defaultDraft(), ratePercent: '-1' }
    const edge = { ...defaultDraft(), ratePercent: '-1200' }

    expect(validateScenarios([negative], 'savings').ok).toBe(false)
    expect(validateScenarios([negative], 'investment').ok).toBe(true)
    expect(validateScenarios([edge], 'investment').ok).toBe(false)
    expect(validateScenarios([{ ...defaultDraft(), ratePercent: '-1199.99' }], 'investment').ok).toBe(true)
  })

  it('accepts a term of a whole number of months only', () => {
    for (const months of ['1.5', '-1', '601', '', '1e2']) {
      expect(validateScenarios([{ ...defaultDraft(), months }], 'savings').ok).toBe(false)
    }
    expect(validateScenarios([{ ...defaultDraft(), months: '600' }], 'savings').ok).toBe(true)
  })
})
