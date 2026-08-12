import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authGetUser, fromMock, upsertMock } = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  fromMock: vi.fn(),
  upsertMock: vi.fn(),
}))

vi.mock('../supabase/client', () => ({
  supabase: {
    auth: { getUser: authGetUser },
    from: fromMock,
  },
}))

import { freshStore } from '../../test/content'
import { useMirabiStore } from '../store/useMirabiStore'
import { reconcileOnManualSignIn, reconcileOnSignIn } from './syncEngine'

/** Simula lo que devuelve `.from('progress_snapshots').select(...).eq().eq().maybeSingle()`. */
function mockRemoteSnapshot(remote: { data: Record<string, unknown>; schema_version: number } | null) {
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: remote }),
        }),
      }),
    }),
    upsert: upsertMock,
  })
}

beforeEach(() => {
  freshStore()
  fromMock.mockReset()
  upsertMock.mockReset().mockResolvedValue({})
  authGetUser.mockReset().mockResolvedValue({ data: { user: { id: 'user-real' } } })
})

describe('reconcileOnManualSignIn', () => {
  it('prefiere el snapshot remoto sobre el progreso local, aunque el local no este vacio', async () => {
    useMirabiStore.setState({ totalXp: 500, totalLessonsCompleted: 12 })
    const remoteState = {
      ...JSON.parse(useMirabiStore.getState().exportProgress()).state,
      totalXp: 30,
      totalLessonsCompleted: 2,
    }
    mockRemoteSnapshot({ data: remoteState, schema_version: 2 })

    const outcome = await reconcileOnManualSignIn('user-real')

    expect(outcome).toBe('restored-remote')
    expect(useMirabiStore.getState().totalXp).toBe(30)
    expect(useMirabiStore.getState().totalLessonsCompleted).toBe(2)
  })

  it('mantiene el progreso local si la cuenta todavia no tiene snapshot remoto', async () => {
    useMirabiStore.setState({ totalXp: 500, totalLessonsCompleted: 12 })
    mockRemoteSnapshot(null)

    const outcome = await reconcileOnManualSignIn('user-real')

    expect(outcome).toBe('kept-local')
    expect(useMirabiStore.getState().totalXp).toBe(500)
    expect(upsertMock).not.toHaveBeenCalled()
  })
})

describe('reconcileOnSignIn', () => {
  it('trae el remoto cuando el dispositivo esta recien instalado (sin progreso local)', async () => {
    const remoteState = { ...JSON.parse(useMirabiStore.getState().exportProgress()).state, totalXp: 80 }
    mockRemoteSnapshot({ data: remoteState, schema_version: 2 })

    await reconcileOnSignIn('user-real')

    expect(useMirabiStore.getState().totalXp).toBe(80)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('sube el local cuando el dispositivo ya tenia progreso real', async () => {
    useMirabiStore.setState({ totalXp: 120, totalLessonsCompleted: 3 })
    mockRemoteSnapshot(null)

    await reconcileOnSignIn('user-real')

    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock.mock.calls[0][0]).toMatchObject({ user_id: 'user-real', platform: 'web' })
  })
})
