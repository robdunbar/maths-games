export type Operation = 'add' | 'subtract' | 'multiply' | 'divide'
export type Level = 10 | 20 | 50 | 100 | 1000

export interface GameSettings {
  operation: Operation
  table: number
  level: Level
}

export interface Question {
  id: string
  value: number
  answer: number
}

export interface Round {
  centerNumber: number
  questions: Question[]
}

export const operations: Operation[] = ['add', 'subtract', 'multiply', 'divide']
export const levels: Level[] = [10, 20, 50, 100, 1000]

export function createRandomSettings(random = Math.random): GameSettings {
  return {
    operation: operations[randomInteger(0, operations.length - 1, random)],
    table: randomInteger(1, 12, random),
    level: levels[randomInteger(0, levels.length - 1, random)],
  }
}

export const operationSymbols: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
}

export const operationNames: Record<Operation, string> = {
  add: 'Addition',
  subtract: 'Subtraction',
  multiply: 'Multiplication',
  divide: 'Division',
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function randomInteger(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1))
}

function chooseCenter(level: Level, random: () => number): number {
  const ranges: Record<Level, [number, number, number]> = {
    10: [1, 5, 1],
    20: [2, 10, 1],
    50: [5, 20, 1],
    100: [10, 40, 5],
    1000: [100, 400, 10],
  }
  const [min, max, step] = ranges[level]
  const stepCount = Math.floor((max - min) / step)
  return min + randomInteger(0, stepCount, random) * step
}

function fillFromCandidates(candidates: number[], random: () => number): number[] {
  const values: number[] = []
  while (values.length < 12) {
    values.push(...shuffle(candidates, random).slice(0, 12 - values.length))
  }
  return values
}

export function createRound(settings: GameSettings, random = Math.random): Round {
  const { operation, table, level } = settings

  if (operation === 'multiply' || operation === 'divide') {
    const facts = shuffle(Array.from({ length: 12 }, (_, index) => index + 1), random)
    return {
      centerNumber: table,
      questions: facts.map((fact, index) => ({
        id: `${operation}-${index}-${fact}`,
        value: operation === 'multiply' ? fact : fact * table,
        answer: operation === 'multiply' ? fact * table : fact,
      })),
    }
  }

  const centerNumber = chooseCenter(level, random)
  const candidates = operation === 'add'
    ? Array.from({ length: level - centerNumber + 1 }, (_, index) => index)
    : Array.from({ length: level - centerNumber + 1 }, (_, index) => centerNumber + index)
  const values = fillFromCandidates(candidates, random)

  return {
    centerNumber,
    questions: values.map((value, index) => ({
      id: `${operation}-${index}-${value}`,
      value,
      answer: operation === 'add' ? value + centerNumber : value - centerNumber,
    })),
  }
}
