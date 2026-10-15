import { describe, expect, it } from 'vitest'
import { createRound, type GameSettings, type Operation } from './game'

const fixedRandom = () => 0.42

function settings(operation: Operation): GameSettings {
  return { operation, table: 7, level: 20 }
}

describe('createRound', () => {
  it('uses each multiplier from 1 to 12 exactly once', () => {
    const round = createRound(settings('multiply'), fixedRandom)
    expect(round.centerNumber).toBe(7)
    expect(round.questions.map((question) => question.value).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    )
    round.questions.forEach((question) => expect(question.answer).toBe(question.value * 7))
  })

  it('uses the first twelve exact multiples for division', () => {
    const round = createRound(settings('divide'), fixedRandom)
    expect(round.questions.map((question) => question.value).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, index) => (index + 1) * 7),
    )
    round.questions.forEach((question) => expect(question.value / 7).toBe(question.answer))
  })

  it.each([10, 20, 50, 100, 1000] as const)('keeps addition results within %i', (level) => {
    const round = createRound({ ...settings('add'), level }, fixedRandom)
    expect(round.questions).toHaveLength(12)
    round.questions.forEach((question) => {
      expect(question.answer).toBe(question.value + round.centerNumber)
      expect(question.answer).toBeLessThanOrEqual(level)
      expect(question.answer).toBeGreaterThanOrEqual(0)
    })
  })

  it.each([10, 20, 50, 100, 1000] as const)('keeps subtraction non-negative and within %i', (level) => {
    const round = createRound({ ...settings('subtract'), level }, fixedRandom)
    expect(round.questions).toHaveLength(12)
    round.questions.forEach((question) => {
      expect(question.answer).toBe(question.value - round.centerNumber)
      expect(question.answer).toBeGreaterThanOrEqual(0)
      expect(question.value).toBeLessThanOrEqual(level)
    })
  })
})
