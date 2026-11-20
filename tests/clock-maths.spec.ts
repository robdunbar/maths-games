import { expect, test, type Page } from '@playwright/test'

async function openApp(page: Page) {
  await page.goto('/maths-games/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

function answerFor(label: string): number {
  const match = label.match(/(\d+) ([+−×÷]) (\d+)/)
  if (!match) throw new Error(`Cannot parse question label: ${label}`)

  const left = Number(match[1])
  const operator = match[2]
  const right = Number(match[3])
  switch (operator) {
    case '+': return left + right
    case '−': return left - right
    case '×': return left * right
    case '÷': return left / right
    default: throw new Error(`Unknown operator: ${operator}`)
  }
}

async function chooseOperation(page: Page, operation: 'Addition' | 'Subtraction' | 'Multiplication' | 'Division') {
  await page.getByRole('radio', { name: operation }).check()
}

async function startRound(page: Page) {
  await page.getByRole('button', { name: /Start the clock/i }).click()
  await expect(page.getByLabel('Maths question clock')).toBeVisible()
}

test('shows the matching table or level controls for every operation', async ({ page }) => {
  await openApp(page)
  await chooseOperation(page, 'Addition')

  await expect(page.getByRole('group', { name: 'Biggest number' })).toBeVisible()

  await chooseOperation(page, 'Multiplication')
  await expect(page.getByRole('group', { name: 'Times table' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Biggest number' })).toHaveCount(0)
  await page.getByRole('button', { name: '4', exact: true }).click()

  await chooseOperation(page, 'Division')
  await expect(page.getByRole('group', { name: 'Times table' })).toBeVisible()
  await page.getByRole('button', { name: '7', exact: true }).click()

  await chooseOperation(page, 'Subtraction')
  await expect(page.getByRole('group', { name: 'Biggest number' })).toBeVisible()
  await page.getByRole('button', { name: 'to 50', exact: true }).click()

  await chooseOperation(page, 'Addition')
  await expect(page.getByRole('group', { name: 'Biggest number' })).toBeVisible()
  await page.getByRole('button', { name: 'to 20', exact: true }).click()
})

for (const setup of [
  { operation: 'Multiplication' as const, choice: '4', choiceName: '4', symbol: '×' },
  { operation: 'Division' as const, choice: '7', choiceName: '7', symbol: '÷' },
  { operation: 'Addition' as const, choice: '20', choiceName: 'to 20', symbol: '+' },
  { operation: 'Subtraction' as const, choice: '50', choiceName: 'to 50', symbol: '−' },
]) {
  test(`completes a ${setup.operation.toLowerCase()} round on desktop`, async ({ page }) => {
    await openApp(page)
    await chooseOperation(page, setup.operation)

    if (setup.operation === 'Multiplication' || setup.operation === 'Division') {
      await page.getByRole('button', { name: setup.choiceName, exact: true }).click()
    } else {
      await page.getByRole('button', { name: setup.choiceName, exact: true }).click()
    }

    await startRound(page)

    const inputs = page.getByRole('textbox')
    await expect(inputs).toHaveCount(12)
    await expect(inputs.first()).toBeFocused()

    for (let index = 0; index < 12; index += 1) {
      const input = inputs.nth(index)
      const label = await input.getAttribute('aria-label')
      if (!label) throw new Error('Answer input has no aria-label')
      if (index === 0) await page.keyboard.type(String(answerFor(label)))
      else await input.fill(String(answerFor(label)))
      await input.press('Enter')
    }

    await expect(page.getByRole('dialog', { name: 'Clock complete' })).toBeVisible()
    await expect(page.getByText('accuracy', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: /Play again/i }).click()
    await expect(inputs.first()).toBeFocused()
  })
}

test('shows wrong feedback and resets the saved time for a level', async ({ page }) => {
  await openApp(page)
  await chooseOperation(page, 'Multiplication')
  await page.getByRole('button', { name: '4', exact: true }).click()
  await startRound(page)

  const firstInput = page.getByRole('textbox').first()
  await firstInput.fill('999')
  await firstInput.press('Enter')
  await expect(firstInput.locator('xpath=ancestor::form')).toHaveClass(/wrong/)

  await page.evaluate(() => {
    localStorage.setItem('clock-maths-best-times', JSON.stringify({ 'multiply-4': 12_345 }))
  })
  await page.reload()
  await chooseOperation(page, 'Multiplication')
  await page.getByRole('button', { name: '4', exact: true }).click()
  await startRound(page)

  await page.getByRole('button', { name: 'Open settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Best time' })).toContainText('0:12.3')
  await page.getByRole('button', { name: /Reset this level/i }).click()
  await expect(page.evaluate(() => JSON.parse(localStorage.getItem('clock-maths-best-times') ?? '{}'))).resolves.toEqual({})
})

test('Tab checks answers and moves between unanswered boxes on desktop', async ({ page }) => {
  await openApp(page)
  await chooseOperation(page, 'Multiplication')
  await page.getByRole('button', { name: '4', exact: true }).click()
  await startRound(page)

  const inputs = page.getByRole('textbox')
  const secondInput = inputs.nth(1)
  const secondLabel = await secondInput.getAttribute('aria-label')
  if (!secondLabel) throw new Error('Answer input has no aria-label')
  await secondInput.fill(String(answerFor(secondLabel)))
  await secondInput.press('Enter')

  const firstInput = inputs.nth(0)
  await firstInput.fill('999')
  await firstInput.press('Tab')
  await expect(firstInput.locator('xpath=ancestor::form')).toHaveClass(/wrong/)
  await expect(inputs.nth(2)).toBeFocused()
  await expect(page.getByLabel(/correct from 12/i)).toContainText('2 guesses')

  await inputs.nth(2).press('Tab')
  await expect(inputs.nth(3)).toBeFocused()
  await expect(page.getByLabel(/correct from 12/i)).toContainText('2 guesses')
})

test('clicking away checks an answer without overriding focus or double-counting', async ({ page }) => {
  await openApp(page)
  await chooseOperation(page, 'Multiplication')
  await page.getByRole('button', { name: '4', exact: true }).click()
  await startRound(page)

  const inputs = page.getByRole('textbox')
  const firstInput = inputs.nth(0)
  const firstLabel = await firstInput.getAttribute('aria-label')
  if (!firstLabel) throw new Error('Answer input has no aria-label')
  await firstInput.fill(String(answerFor(firstLabel)))
  await inputs.nth(2).click()
  await expect(firstInput.locator('xpath=ancestor::form')).toHaveClass(/correct/)
  await expect(inputs.nth(2)).toBeFocused()
  await expect(page.getByLabel(/correct from 12/i)).toContainText('1 guesses')

  await inputs.nth(2).fill('999')
  await inputs.nth(2).locator('xpath=ancestor::form').getByRole('button').click()
  await expect(inputs.nth(2).locator('xpath=ancestor::form')).toHaveClass(/wrong/)
  await expect(page.getByLabel(/correct from 12/i)).toContainText('2 guesses')
})

test('switching portrait-phone questions checks the previous answer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openApp(page)
  await chooseOperation(page, 'Multiplication')
  await page.getByRole('button', { name: '4', exact: true }).click()
  await startRound(page)

  const input = page.getByRole('textbox', { name: /Answer for/i })
  const label = await input.getAttribute('aria-label')
  if (!label) throw new Error('Portrait answer input has no aria-label')
  const firstMarker = page.getByRole('button', { name: `${label.replace('Answer for ', '')}, correct`, exact: true })
  const secondMarker = page.getByRole('button', { name: /^\d+ × 4$/ }).nth(1)
  await input.fill(String(answerFor(label)))
  await secondMarker.click()
  await expect(firstMarker).toHaveClass(/correct/)
  await expect(input).not.toHaveAttribute('aria-label', label)
  await expect(page.getByLabel(/correct from 12/i)).toContainText('1 guesses')

  await input.fill('999')
  await page.getByRole('button', { name: 'Check selected answer' }).click()
  await expect(page.getByLabel(/correct from 12/i)).toContainText('2 guesses')
})

test('completes a round with the portrait-phone answer panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openApp(page)
  await chooseOperation(page, 'Multiplication')
  await page.getByRole('button', { name: '4', exact: true }).click()
  await startRound(page)

  await expect(page.getByRole('textbox', { name: /Answer for/i })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(1)
  await expect(page.getByRole('textbox', { name: /Answer for/i })).toBeFocused()

  for (let index = 0; index < 12; index += 1) {
    const input = page.getByRole('textbox', { name: /Answer for/i })
    const label = await input.getAttribute('aria-label')
    if (!label) throw new Error('Portrait answer input has no aria-label')
    if (index === 0) await page.keyboard.type(String(answerFor(label.replace('Answer for ', ''))))
    else await input.fill(String(answerFor(label.replace('Answer for ', ''))))
    await input.press('Enter')
  }

  await expect(page.getByRole('dialog', { name: 'Clock complete' })).toBeVisible()
  await page.getByRole('button', { name: /Play again/i }).click()
  await expect(page.getByRole('textbox', { name: /Answer for/i })).toBeFocused()
})

for (const viewport of [
  { name: 'narrow portrait', width: 320, height: 568 },
  { name: 'wide portrait', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
]) {
  test(`setup and game do not overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await openApp(page)

    const setupOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(setupOverflow).toBe(false)

    await chooseOperation(page, 'Addition')
    await page.getByRole('button', { name: 'to 20', exact: true }).click()
    await startRound(page)

    const gameOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(gameOverflow).toBe(false)
  })
}
