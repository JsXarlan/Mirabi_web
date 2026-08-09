import { describe, expect, it } from 'vitest'

import { nextRandom, pickDistinct, seedOf, shuffle } from './seededRandom'

/** Generador determinista: la misma entrada da siempre la misma salida. */

describe('seedOf / nextRandom', () => {
  it('la misma cadena produce siempre la misma semilla', () => {
    expect(seedOf('kana-hiragana-a')).toBe(seedOf('kana-hiragana-a'))
  })

  it('cadenas distintas producen semillas distintas', () => {
    expect(seedOf('a')).not.toBe(seedOf('b'))
  })

  it('nunca devuelve cero: evita que la secuencia se quede fija', () => {
    expect(seedOf('')).not.toBe(0)
  })
})

describe('pickDistinct', () => {
  it('elige sin repetir, hasta count o hasta vaciar el pool', () => {
    const { picked } = pickDistinct(['a', 'b', 'c', 'd'], 2, seedOf('x'))
    expect(picked).toHaveLength(2)
    expect(new Set(picked).size).toBe(2)
  })

  it('con menos elementos que count, devuelve lo que haya', () => {
    const { picked } = pickDistinct(['a', 'b'], 5, seedOf('x'))
    expect(picked).toHaveLength(2)
  })

  it('con pool vacío, no elige nada', () => {
    const { picked } = pickDistinct([], 3, seedOf('x'))
    expect(picked).toEqual([])
  })

  it('es determinista: misma semilla, misma elección', () => {
    const seed = seedOf('kana-hiragana-a')
    expect(pickDistinct(['a', 'b', 'c', 'd', 'e'], 3, seed).picked).toEqual(
      pickDistinct(['a', 'b', 'c', 'd', 'e'], 3, seed).picked,
    )
  })

  it('devuelve la semilla avanzada, para encadenar otra tanda', () => {
    const { seed: advanced } = pickDistinct(['a', 'b'], 1, seedOf('x'))
    expect(advanced).not.toBe(seedOf('x'))
    expect(advanced).toBe(nextRandom(seedOf('x')))
  })
})

describe('shuffle', () => {
  it('es una permutación: mismos elementos, mismo tamaño', () => {
    const input = ['a', 'b', 'c', 'd']
    const output = shuffle(input, 'seed-1')
    expect(output).toHaveLength(input.length)
    expect([...output].sort()).toEqual([...input].sort())
  })

  it('no muta el array original', () => {
    const input = ['a', 'b', 'c']
    shuffle(input, 'seed-1')
    expect(input).toEqual(['a', 'b', 'c'])
  })

  it('es determinista: misma semilla, mismo orden', () => {
    expect(shuffle(['a', 'b', 'c', 'd'], 'kana-hiragana-a')).toEqual(
      shuffle(['a', 'b', 'c', 'd'], 'kana-hiragana-a'),
    )
  })

  it('semillas distintas tienden a dar órdenes distintos', () => {
    const seeds = Array.from({ length: 10 }, (_, i) => `seed-${i}`)
    const orders = seeds.map((seed) => shuffle(['a', 'b', 'c', 'd'], seed).join(''))
    expect(new Set(orders).size).toBeGreaterThan(1)
  })
})
