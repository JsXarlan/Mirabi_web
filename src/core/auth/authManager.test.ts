import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, reconcileOnManualSignInMock } = vi.hoisted(() => ({
  authMock: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  reconcileOnManualSignInMock: vi.fn(),
}))

vi.mock('../supabase/client', () => ({ supabase: { auth: authMock } }))
vi.mock('../sync/syncEngine', () => ({
  reconcileOnManualSignIn: reconcileOnManualSignInMock,
  reconcileOnSignIn: vi.fn(),
}))

import { freshStore } from '../../test/content'
import { useMirabiStore } from '../store/useMirabiStore'
import { signInWithPassword, signOut } from './authManager'

beforeEach(() => {
  freshStore()
  authMock.signInWithPassword.mockReset()
  authMock.signOut.mockReset().mockResolvedValue({})
  reconcileOnManualSignInMock.mockReset()
})

describe('signInWithPassword', () => {
  it('reconcilia contra la cuenta real y reporta si se restauro progreso remoto', async () => {
    authMock.signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-real' } }, error: null })
    reconcileOnManualSignInMock.mockResolvedValue('restored-remote')

    const result = await signInWithPassword('a@b.com', 'secret')

    expect(reconcileOnManualSignInMock).toHaveBeenCalledWith('user-real')
    expect(result).toEqual({ ok: true, progressRestored: true })
  })

  it('no reconcilia ni pisa nada si el login falla', async () => {
    authMock.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    })

    const result = await signInWithPassword('a@b.com', 'wrong')

    expect(reconcileOnManualSignInMock).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, message: 'Invalid login credentials' })
  })
})

describe('signOut', () => {
  it('limpia la sesion del store ademas de cerrarla en Supabase', async () => {
    useMirabiStore.getState().setAuthSession({ userId: 'u1', isAnonymous: false, email: 'a@b.com' })

    await signOut()

    expect(authMock.signOut).toHaveBeenCalled()
    expect(useMirabiStore.getState().userId).toBeNull()
    expect(useMirabiStore.getState().email).toBeNull()
  })
})
