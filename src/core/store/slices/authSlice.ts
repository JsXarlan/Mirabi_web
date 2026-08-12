import type { StateCreator } from 'zustand'

import type { MirabiStore } from '../useMirabiStore'

/**
 * Estado de sesion de Supabase. No se persiste a proposito (no vive en
 * `initialPersisted`, mismo patron que `achievementToastQueue`): la sesion
 * real la maneja el propio cliente de Supabase en su storage; este slice es
 * solo un espejo para que la UI reaccione sin importar core/supabase directo.
 */
export interface AuthState {
  userId: string | null
  isAnonymous: boolean
  email: string | null
  authStatus: 'loading' | 'ready' | 'error'
  pendingEmailConfirmation: string | null
}

export interface AuthSlice extends AuthState {
  setAuthSession: (session: { userId: string; isAnonymous: boolean; email: string | null }) => void
  setAuthStatus: (status: AuthState['authStatus']) => void
  setPendingEmailConfirmation: (email: string | null) => void
  clearAuthSession: () => void
}

const initialAuthState: AuthState = {
  userId: null,
  isAnonymous: true,
  email: null,
  authStatus: 'loading',
  pendingEmailConfirmation: null,
}

export const createAuthSlice: StateCreator<MirabiStore, [], [], AuthSlice> = (set) => ({
  ...initialAuthState,

  setAuthSession: ({ userId, isAnonymous, email }) =>
    set({ userId, isAnonymous, email, authStatus: 'ready', pendingEmailConfirmation: null }),

  setAuthStatus: (authStatus) => set({ authStatus }),

  setPendingEmailConfirmation: (pendingEmailConfirmation) => set({ pendingEmailConfirmation }),

  clearAuthSession: () => set({ ...initialAuthState, authStatus: 'ready' }),
})
