import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReward } from 'partycles'
import App from './App'

vi.mock('partycles', () => ({
  useReward: vi.fn(() => ({ reward: () => Promise.resolve() })),
}))

describe('Clock Maths', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('shows wrong and correct feedback and counts guesses', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: /multiplication/i }))
    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: /start the clock/i }))

    const inputs = screen.getAllByRole('textbox')
    const firstInput = inputs[0]
    await user.type(firstInput, '999{Enter}')
    expect(firstInput.closest('form')).toHaveClass('wrong')
    expect(screen.getByLabelText(/correct from 12/i)).toHaveTextContent('1 guesses')

    await user.clear(firstInput)
    const label = firstInput.getAttribute('aria-label')!
    const value = Number(label.split(' ')[0])
    await user.type(firstInput, `${value * 4}{Enter}`)
    expect(firstInput.closest('form')).toHaveClass('correct')
    expect(firstInput).toBeDisabled()
    expect(inputs[1]).toHaveFocus()
    expect(screen.getByLabelText(/correct from 12/i)).toHaveTextContent('1/12 correct')
    expect(screen.getByLabelText(/correct from 12/i)).toHaveTextContent('2 guesses')
  })

  it('shows and resets the saved best time for the current level', async () => {
    localStorage.setItem('clock-maths-best-times', JSON.stringify({ 'multiply-4': 12_345 }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: /multiplication/i }))
    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: /start the clock/i }))

    expect(screen.getByLabelText(/correct from 12/i)).toHaveTextContent('0:12.3')
    await user.click(screen.getByRole('button', { name: /open settings/i }))
    expect(screen.getByRole('dialog', { name: /best time/i })).toHaveTextContent('0:12.3')

    await user.click(screen.getByRole('button', { name: /reset this level/i }))
    expect(JSON.parse(localStorage.getItem('clock-maths-best-times') ?? '{}')).toEqual({})
    expect(screen.getByLabelText(/correct from 12/i)).not.toHaveTextContent('0:12.3')
  })

  it('uses one large answer field and advances between markers on portrait phones', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width: 600px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: /multiplication/i }))
    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: /start the clock/i }))

    const markers = screen.getAllByRole('button', { name: /^\d+ × 4$/ })
    await user.click(markers[1])
    const value = Number(markers[1].getAttribute('aria-label')?.split(' ')[0])
    const answerInput = screen.getByRole('textbox', { name: /answer for/i })
    expect(answerInput).toHaveAttribute('inputmode', 'numeric')

    await user.type(answerInput, '999{Enter}')
    expect(answerInput.closest('form')).toHaveClass('wrong')
    await user.clear(answerInput)
    await user.type(answerInput, `${value * 4}{Enter}`)

    expect(markers[1]).toHaveClass('correct')
    expect(screen.getByRole('textbox', { name: /answer for/i })).not.toBeDisabled()
    expect(screen.getByLabelText(/correct from 12/i)).toHaveTextContent('1/12 correct')
  })

  it('randomizes editable defaults on opening setup, not when starting a chosen game', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('radio', { name: /addition/i })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Choose the biggest number' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('radio', { name: /multiplication/i }))
    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: /start the clock/i }))
    expect(screen.getAllByRole('textbox')[0]).toHaveAccessibleName(/× 4$/)

    random.mockReturnValue(0.999)
    await user.click(screen.getByRole('button', { name: /change game/i }))
    expect(screen.getByRole('radio', { name: /division/i })).toBeChecked()
    expect(screen.getByRole('button', { name: '12' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('radio', { name: /subtraction/i }))
    expect(screen.getByRole('button', { name: 'to 1000' })).toHaveAttribute('aria-pressed', 'true')
  })

  it.each([false, true])('uses slower completion fireworks only on portrait phones: %s', async (portrait) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: portrait,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: /multiplication/i }))
    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: /start the clock/i }))

    for (let index = 0; index < 12; index += 1) {
      const input = portrait
        ? screen.getByRole('textbox', { name: /answer for/i })
        : screen.getAllByRole('textbox')[index]
      const value = Number(input.getAttribute('aria-label')!.replace('Answer for ', '').split(' ')[0])
      await user.type(input, `${value * 4}{Enter}`)
    }

    expect(screen.getByRole('dialog', { name: /clock complete/i })).toBeInTheDocument()
    expect(useReward).toHaveBeenCalledWith(expect.anything(), 'fireworks', expect.objectContaining({
      startVelocity: portrait ? 19 : 38,
      duration: portrait ? 1800 : 900,
    }))
  })
})
