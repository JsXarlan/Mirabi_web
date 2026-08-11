import { describe, expect, it } from 'vitest'

import { buildWordQuizQuestion } from './wordQuiz'
import { wordCatalog } from '../../test/content'

describe('buildWordQuizQuestion', () => {
  it('la respuesta correcta esta entre las opciones, sin repetidos', () => {
    for (const word of wordCatalog.words.slice(0, 30)) {
      const question = buildWordQuizQuestion(word, wordCatalog)
      expect(question.options).toContain(question.correctAnswer)
      expect(new Set(question.options).size).toBe(question.options.length)
      expect(question.options.length).toBeGreaterThan(1)
      expect(question.options.length).toBeLessThanOrEqual(4)
    }
  })

  it('es determinista: la misma palabra da las mismas opciones', () => {
    const word = wordCatalog.words[0]
    const a = buildWordQuizQuestion(word, wordCatalog)
    const b = buildWordQuizQuestion(word, wordCatalog)
    expect(a.options).toEqual(b.options)
  })
})
