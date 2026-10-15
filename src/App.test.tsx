import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('Clock Maths', () => {
  beforeEach(() => localStorage.clear())

  it('shows wrong and correct feedback and counts guesses', async () => {
    const user = userEvent.setup()
    render(<App />)
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
    expect(screen.getByLabelText(/correct from 12/i)).toHaveTextContent('1/12 correct')
    expect(screen.getByLabelText(/correct from 12/i)).toHaveTextContent('2 guesses')
  })

  it('shows and resets the saved best time for the current level', async () => {
    localStorage.setItem('clock-maths-best-times', JSON.stringify({ 'multiply-4': 12_345 }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /start the clock/i }))

    expect(screen.getByLabelText(/correct from 12/i)).toHaveTextContent('0:12.3')
    await user.click(screen.getByRole('button', { name: /open settings/i }))
    expect(screen.getByRole('dialog', { name: /best time/i })).toHaveTextContent('0:12.3')

    await user.click(screen.getByRole('button', { name: /reset this level/i }))
    expect(JSON.parse(localStorage.getItem('clock-maths-best-times') ?? '{}')).toEqual({})
    expect(screen.getByLabelText(/correct from 12/i)).not.toHaveTextContent('0:12.3')
  })
})
