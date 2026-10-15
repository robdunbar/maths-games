import { FormEvent, useEffect, useRef, useState } from 'react'
import { useReward } from 'partycles'
import {
  createRound,
  type GameSettings,
  type Level,
  type Operation,
  operationNames,
  operationSymbols,
  type Question,
  type Round,
} from './game'

type AnswerState = 'idle' | 'wrong' | 'correct'

interface QuestionState {
  value: string
  status: AnswerState
  burst: number
}

const operations: Operation[] = ['add', 'subtract', 'multiply', 'divide']
const levels: Level[] = [10, 20, 50, 100, 1000]
const recordsStorageKey = 'clock-maths-best-times'

function getLevelKey(settings: GameSettings): string {
  const difficulty = settings.operation === 'multiply' || settings.operation === 'divide'
    ? settings.table
    : settings.level
  return `${settings.operation}-${difficulty}`
}

function getLevelName(settings: GameSettings): string {
  if (settings.operation === 'multiply') return `× ${settings.table}`
  if (settings.operation === 'divide') return `÷ ${settings.table}`
  return `${operationNames[settings.operation]} to ${settings.level}`
}

function loadRecords(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(recordsStorageKey) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function formatTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60_000)
  const seconds = Math.floor((milliseconds % 60_000) / 1000)
  const tenths = Math.floor((milliseconds % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

function currentTime(): number {
  return Date.now()
}

function matchesPortraitPhone(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches
}

function initialAnswers(round: Round): Record<string, QuestionState> {
  return Object.fromEntries(
    round.questions.map((question) => [question.id, { value: '', status: 'idle', burst: 0 }]),
  )
}

function App() {
  const [screen, setScreen] = useState<'setup' | 'game'>('setup')
  const [settings, setSettings] = useState<GameSettings>({ operation: 'multiply', table: 4, level: 20 })
  const [round, setRound] = useState<Round>(() => createRound(settings))
  const [answers, setAnswers] = useState<Record<string, QuestionState>>(() => initialAnswers(round))
  const [guesses, setGuesses] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [completionTime, setCompletionTime] = useState<number | null>(null)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [records, setRecords] = useState<Record<string, number>>(loadRecords)
  const [showSettings, setShowSettings] = useState(false)
  const [isPortraitPhone, setIsPortraitPhone] = useState(matchesPortraitPhone)
  const [visibleHeight, setVisibleHeight] = useState(() => window.visualViewport?.height ?? window.innerHeight)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [selectedQuestionId, setSelectedQuestionId] = useState(round.questions[0].id)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const mobileInputRef = useRef<HTMLInputElement | null>(null)
  const startTimeRef = useRef(0)
  const fullViewportHeightRef = useRef(Math.max(window.innerHeight, window.visualViewport?.height ?? 0))

  const correct = Object.values(answers).filter((answer) => answer.status === 'correct').length
  const complete = correct === 12
  const accuracy = guesses === 0 ? 100 : Math.round((correct / guesses) * 100)
  const levelKey = getLevelKey(settings)
  const bestTime = records[levelKey]
  const selectedQuestion = round.questions.find((question) => question.id === selectedQuestionId) ?? round.questions[0]

  useEffect(() => {
    if (screen !== 'game' || complete) return
    const interval = window.setInterval(() => setElapsedTime(Date.now() - startTimeRef.current), 100)
    return () => window.clearInterval(interval)
  }, [screen, complete])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 600px) and (orientation: portrait)')
    const updateMode = () => setIsPortraitPhone(mediaQuery.matches)
    mediaQuery.addEventListener('change', updateMode)
    return () => mediaQuery.removeEventListener('change', updateMode)
  }, [])

  useEffect(() => {
    const viewport = window.visualViewport
    const updateHeight = () => {
      const nextHeight = viewport?.height ?? window.innerHeight
      fullViewportHeightRef.current = Math.max(fullViewportHeightRef.current, nextHeight)
      setVisibleHeight(nextHeight)
      setKeyboardOpen(fullViewportHeightRef.current - nextHeight > 120)
    }
    viewport?.addEventListener('resize', updateHeight)
    window.addEventListener('resize', updateHeight)
    return () => {
      viewport?.removeEventListener('resize', updateHeight)
      window.removeEventListener('resize', updateHeight)
    }
  }, [])

  function startRound(nextSettings = settings) {
    const nextRound = createRound(nextSettings)
    setSettings(nextSettings)
    setRound(nextRound)
    setAnswers(initialAnswers(nextRound))
    setSelectedQuestionId(nextRound.questions[0].id)
    setGuesses(0)
    startTimeRef.current = currentTime()
    setElapsedTime(0)
    setCompletionTime(null)
    setIsNewRecord(false)
    setAnnouncement('A new round has started.')
    setScreen('game')
  }

  function handleSetupSubmit(event: FormEvent) {
    event.preventDefault()
    startRound()
  }

  function updateValue(question: Question, value: string) {
    if (!/^\d*$/.test(value)) return
    setAnswers((current) => ({
      ...current,
      [question.id]: { ...current[question.id], value, status: 'idle' },
    }))
  }

  function getNextQuestion(currentId: string): Question | undefined {
    const currentIndex = round.questions.findIndex((question) => question.id === currentId)
    for (let offset = 1; offset < round.questions.length; offset += 1) {
      const next = round.questions[(currentIndex + offset) % round.questions.length]
      if (answers[next.id].status !== 'correct') return next
    }
    return undefined
  }

  function focusNext(currentId: string) {
    const next = getNextQuestion(currentId)
    if (!next) return
    setSelectedQuestionId(next.id)
    window.setTimeout(() => {
      if (isPortraitPhone) mobileInputRef.current?.focus()
      else inputRefs.current[next.id]?.focus()
    }, 100)
  }

  function submitAnswer(event: FormEvent, question: Question) {
    event.preventDefault()
    const answer = answers[question.id]
    if (!answer.value || answer.status === 'correct') return

    setGuesses((current) => current + 1)
    if (Number(answer.value) === question.answer) {
      if (correct === 11) {
        const finalTime = currentTime() - startTimeRef.current
        setElapsedTime(finalTime)
        setCompletionTime(finalTime)
        if (!bestTime || finalTime < bestTime) {
          setIsNewRecord(true)
          const nextRecords = { ...records, [levelKey]: finalTime }
          setRecords(nextRecords)
          localStorage.setItem(recordsStorageKey, JSON.stringify(nextRecords))
        }
      }
      setAnswers((current) => ({
        ...current,
        [question.id]: { ...current[question.id], status: 'correct', burst: current[question.id].burst + 1 },
      }))
      setAnnouncement(correct === 11
        ? `Clock complete! You got all 12 correct in ${guesses + 1} guesses.`
        : `${question.value} ${operationSymbols[settings.operation]} ${round.centerNumber} is correct!`)
      focusNext(question.id)
    } else {
      setAnswers((current) => ({
        ...current,
        [question.id]: { ...current[question.id], status: 'wrong' },
      }))
      setAnnouncement('Not quite. Try that one again.')
    }
  }

  function resetCurrentRecord() {
    const nextRecords = { ...records }
    delete nextRecords[levelKey]
    setRecords(nextRecords)
    localStorage.setItem(recordsStorageKey, JSON.stringify(nextRecords))
    setAnnouncement(`Best time for ${getLevelName(settings)} has been reset.`)
    setShowSettings(false)
  }

  if (screen === 'setup') {
    return (
      <main className="setup-page">
        <section className="setup-card" aria-labelledby="setup-title">
          <div className="brand-mark" aria-hidden="true"><span>12</span><i /><b>6</b></div>
          <p className="eyebrow">Make every number count</p>
          <h1 id="setup-title">Clock <em>Maths</em></h1>
          <p className="intro">Pick your challenge, then solve your way around the clock.</p>

          <form onSubmit={handleSetupSubmit}>
            <fieldset>
              <legend>What shall we practise?</legend>
              <div className="operation-grid">
                {operations.map((operation) => (
                  <label className={`operation-option operation-${operation}`} key={operation}>
                    <input
                      type="radio"
                      name="operation"
                      value={operation}
                      checked={settings.operation === operation}
                      onChange={() => setSettings((current) => ({ ...current, operation }))}
                    />
                    <span className="operation-symbol">{operationSymbols[operation]}</span>
                    <span>{operationNames[operation]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {settings.operation === 'multiply' || settings.operation === 'divide' ? (
              <div className="choice-section">
                <label htmlFor="table">Choose a times table</label>
                <div className="number-picker" role="group" aria-label="Times table">
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((table) => (
                    <button
                      className={settings.table === table ? 'selected' : ''}
                      type="button"
                      id={table === 1 ? 'table' : undefined}
                      key={table}
                      onClick={() => setSettings((current) => ({ ...current, table }))}
                      aria-pressed={settings.table === table}
                    >
                      {table}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="choice-section">
                <label htmlFor="level">Choose the biggest number</label>
                <div className="level-picker" role="group" aria-label="Biggest number">
                  {levels.map((level) => (
                    <button
                      className={settings.level === level ? 'selected' : ''}
                      type="button"
                      id={level === 10 ? 'level' : undefined}
                      key={level}
                      onClick={() => setSettings((current) => ({ ...current, level }))}
                      aria-pressed={settings.level === level}
                    >
                      to {level}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="start-button" type="submit">Start the clock <span>→</span></button>
          </form>
        </section>
        <div className="shape shape-one" /><div className="shape shape-two" /><div className="shape shape-three" />
      </main>
    )
  }

  return (
    <main
      className={`game-page ${isPortraitPhone ? 'portrait-phone' : ''} ${keyboardOpen ? 'keyboard-open' : ''}`}
      style={{ '--visible-height': `${visibleHeight}px` } as React.CSSProperties}
    >
      <header className="game-header">
        <button className="back-button" onClick={() => setScreen('setup')} type="button">← Change game</button>
        <div className="mini-brand">Clock <em>Maths</em></div>
        <div className="score-card" aria-label={`${correct} correct from 12, ${guesses} guesses, time ${formatTime(elapsedTime)}`}>
          <span><b>{correct}</b>/12 correct</span>
          <span><b>{guesses}</b> guesses</span>
          <span className="time-score"><b>{formatTime(elapsedTime)}</b> time</span>
          <span className="best-score"><b>{bestTime ? formatTime(bestTime) : '—'}</b> best</span>
        </div>
        <button className="settings-button" onClick={() => setShowSettings(true)} type="button" aria-label="Open settings">⚙</button>
      </header>

      <section className="game-intro">
        <p className="eyebrow">{operationNames[settings.operation]} challenge</p>
        <h1>Work around the clock!</h1>
        <p>Type each answer and press Enter or the tick.</p>
      </section>

      <div className="clock-wrap">
        <div className="clock" aria-label="Maths question clock">
          <div className="clock-ring" aria-hidden="true" />
          {round.questions.map((question, index) => {
            const angle = index * 30
            const answer = answers[question.id]
            return (
              <div className="question-position" style={{ '--angle': `${angle}deg` } as React.CSSProperties} key={question.id}>
                {isPortraitPhone ? (
                  <button
                    className={`question-marker ${answer.status} ${selectedQuestion.id === question.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedQuestionId(question.id)
                      if (answer.status !== 'correct') window.setTimeout(() => mobileInputRef.current?.focus(), 0)
                    }}
                    style={{ '--counter-angle': `${-angle}deg` } as React.CSSProperties}
                    type="button"
                    aria-label={`${question.value} ${operationSymbols[settings.operation]} ${round.centerNumber}${answer.status === 'correct' ? ', correct' : ''}`}
                  >
                    <span>{question.value}</span>
                    {answer.status === 'correct' && <b>✓</b>}
                    {answer.status === 'correct' && <Firework key={answer.burst} />}
                  </button>
                ) : (
                  <form
                    className={`question-card ${answer.status}`}
                    onSubmit={(event) => submitAnswer(event, question)}
                    style={{ '--counter-angle': `${-angle}deg` } as React.CSSProperties}
                  >
                    <label htmlFor={`answer-${question.id}`}>{question.value}</label>
                    <div className="answer-row">
                      <input
                        ref={(node) => { inputRefs.current[question.id] = node }}
                        id={`answer-${question.id}`}
                        aria-label={`${question.value} ${operationSymbols[settings.operation]} ${round.centerNumber}`}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={answer.value}
                        disabled={answer.status === 'correct'}
                        onChange={(event) => updateValue(question, event.target.value)}
                      />
                      <button type="submit" aria-label={`Check answer for ${question.value}`} tabIndex={answer.status === 'correct' ? -1 : 0}>
                        {answer.status === 'correct' ? '✓' : '›'}
                      </button>
                    </div>
                    {answer.status === 'correct' && <Firework key={answer.burst} />}
                  </form>
                )}
              </div>
            )
          })}
          <div className={`clock-center center-${settings.operation}`}>
            <span>{operationSymbols[settings.operation]}</span>
            <strong>{round.centerNumber}</strong>
          </div>
        </div>
      </div>

      {isPortraitPhone && (
        <form className={`mobile-answer-panel ${answers[selectedQuestion.id].status}`} onSubmit={(event) => submitAnswer(event, selectedQuestion)}>
          <label htmlFor="mobile-answer">
            <span>{selectedQuestion.value}</span>
            <i>{operationSymbols[settings.operation]}</i>
            <span>{round.centerNumber}</span>
            <i>=</i>
          </label>
          <input
            ref={mobileInputRef}
            id="mobile-answer"
            aria-label={`Answer for ${selectedQuestion.value} ${operationSymbols[settings.operation]} ${round.centerNumber}`}
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            autoComplete="off"
            value={answers[selectedQuestion.id].value}
            disabled={answers[selectedQuestion.id].status === 'correct'}
            onChange={(event) => updateValue(selectedQuestion, event.target.value)}
          />
          <button type="submit" disabled={answers[selectedQuestion.id].status === 'correct'} aria-label="Check selected answer">
            {answers[selectedQuestion.id].status === 'correct' ? '✓' : 'Check'}
          </button>
        </form>
      )}

      <p className="sr-only" aria-live="polite">{announcement}</p>

      {showSettings && (
        <div className="settings-backdrop" role="presentation" onMouseDown={() => setShowSettings(false)}>
          <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setShowSettings(false)} type="button" aria-label="Close settings">×</button>
            <p className="eyebrow">Settings</p>
            <h2 id="settings-title">Best time</h2>
            <p className="settings-level">{getLevelName(settings)}</p>
            <div className="record-time">{bestTime ? formatTime(bestTime) : 'No time yet'}</div>
            <button className="reset-button" onClick={resetCurrentRecord} type="button" disabled={!bestTime}>Reset this level’s best time</button>
          </section>
        </div>
      )}

      {complete && (
        <div className="modal-backdrop" role="presentation">
          <CelebrationFireworks />
          <section className="complete-card" role="dialog" aria-modal="true" aria-labelledby="complete-title">
            <div className="big-burst" aria-hidden="true">★</div>
            <p className="eyebrow">All the way around!</p>
            <h2 id="complete-title">Clock complete</h2>
            <p>You solved all 12 questions in <strong>{guesses} guesses</strong>.</p>
            <div className="finish-time"><span>{completionTime === null ? '0:00.0' : formatTime(completionTime)}</span> your time</div>
            {isNewRecord && (
              <p className="new-record">New best time!</p>
            )}
            <div className="accuracy"><span>{accuracy}%</span> accuracy</div>
            <div className="complete-actions">
              <button className="start-button" onClick={() => startRound()} type="button">Play again <span>↻</span></button>
              <button className="text-button" onClick={() => setScreen('setup')} type="button">Change game</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

const fireworkPositions = [
  [12, 28], [29, 16], [50, 26], [72, 15], [88, 29],
  [17, 67], [35, 78], [57, 69], [76, 80], [91, 61],
]

function CelebrationFireworks() {
  return (
    <div className="celebration-fireworks" aria-hidden="true">
      {fireworkPositions.map(([left, top], index) => (
        <PartyclesFirework key={`${left}-${top}`} left={left} top={top} delay={index * 350} />
      ))}
    </div>
  )
}

function PartyclesFirework({ left, top, delay }: { left: number; top: number; delay: number }) {
  const originRef = useRef<HTMLElement>(null!)
  const { reward } = useReward(originRef, 'fireworks', {
    particleCount: 42,
    spread: 180,
    startVelocity: 38,
    duration: 900,
    colors: ['#f2643c', '#f8c44f', '#2d9d91', '#608bd5', '#ffffff'],
  })

  useEffect(() => {
    const timeout = window.setTimeout(() => reward(), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, reward])

  return <span ref={originRef} className="partycles-origin" style={{ left: `${left}%`, top: `${top}%` }} />
}

function Firework() {
  return (
    <span className="firework" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--ray': `${index * 45}deg` } as React.CSSProperties} />)}
    </span>
  )
}

export default App
