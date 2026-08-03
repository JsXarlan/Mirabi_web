/**
 * localStorage de mentira, persistencia de verdad.
 *
 * El store usa el middleware `persist`; sin un almacen, zustand lo desactiva y
 * los tests dejarian de cubrir justo lo que mas se rompe al cambiar el modelo:
 * el guardado y la migracion.
 */
class MemoryStorage implements Storage {
  private entries = new Map<string, string>()

  get length(): number {
    return this.entries.size
  }

  clear(): void {
    this.entries.clear()
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.entries.delete(key)
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, String(value))
  }
}

// defineProperty y no asignacion: en Node moderno `localStorage` ya existe como
// accessor de solo lectura y una asignacion normal se pierde en silencio.
Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
})

// zustand busca `window.localStorage`, no el global suelto. Con este alias la
// persistencia de los tests es la misma que la del navegador.
Object.defineProperty(globalThis, 'window', {
  value: globalThis,
  configurable: true,
  writable: true,
})
