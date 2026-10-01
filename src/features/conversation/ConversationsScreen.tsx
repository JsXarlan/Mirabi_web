import { useNavigate } from 'react-router-dom'

import { DEFAULT_REWARD_CONFIG } from '../../core/domain/rewards'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiCard,
  MirabiEmpty,
  SectionTitle,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { AppIcon } from '../../ui/Icons'
import { buildConversations } from './conversations'

export function ConversationsScreen() {
  const navigate = useNavigate()
  const pack = useMirabiStore((state) => state.pack)
  const courseMap = useMirabiStore((state) => state.courseMap)()
  const completed = useMirabiStore(
    (state) => state.completedConversationLessonIds,
  )

  if (!pack || !courseMap) return <Screen title="Conversaciones">{null}</Screen>

  const conversations = buildConversations(pack, courseMap, completed)
  const recommended = conversations.find(
    (conversation) => conversation.isUnlocked && !conversation.isCompleted,
  )

  if (conversations.length === 0) {
    return (
      <Screen title="Conversaciones">
        <MirabiEmpty
          title="Todavía no hay conversaciones"
          message="Aparecerán a medida que avances en el curso."
        />
      </Screen>
    )
  }

  const grouped = conversations.reduce<Record<string, typeof conversations>>(
    (accumulator, conversation) => {
      const key = conversation.worldTitle || 'Curso'
      accumulator[key] = [...(accumulator[key] ?? []), conversation]
      return accumulator
    },
    {},
  )

  return (
    <Screen title="Conversaciones" wide>
      {recommended && (
        <MirabiCard className="feature-banner">
          <Yuki size={96} state="HAPPY" halo={false} />
          <div>
            <p className="text-xs font-semibold text-[var(--on-surface-variant)]">
              Recomendada
            </p>
            <p className="mt-0.5 font-jp text-lg font-bold">
              {recommended.title}
            </p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              {recommended.steps.length} intercambios · +
              {DEFAULT_REWARD_CONFIG.conversationCompletedSakura} Sakura
            </p>
            <MirabiButton
              className="mt-4"
              onClick={() =>
                navigate(`/conversaciones/${recommended.lessonId}`)
              }
            >
              <AppIcon name="conversation" size={21} />
              Iniciar conversación
            </MirabiButton>
          </div>
        </MirabiCard>
      )}

      {Object.entries(grouped).map(([worldTitle, items]) => (
        <section key={worldTitle} className="mt-6">
          <SectionTitle>{worldTitle}</SectionTitle>
          <ul className="conversation-grid">
            {items.map((conversation) => (
              <li key={conversation.lessonId}>
                <MirabiCard
                  className="flex items-center gap-3 p-4"
                  disabled={!conversation.isUnlocked}
                  onClick={() =>
                    conversation.isUnlocked &&
                    navigate(`/conversaciones/${conversation.lessonId}`)
                  }
                >
                  <span aria-hidden className="text-lg">
                    <AppIcon
                      name={
                        conversation.isCompleted
                          ? 'complete'
                          : conversation.isUnlocked
                            ? 'conversation'
                            : 'lock'
                      }
                      size={26}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-jp text-sm font-semibold">
                      {conversation.title}
                    </span>
                    <span className="block text-xs text-[var(--on-surface-variant)]">
                      {conversation.isUnlocked
                        ? `${conversation.steps.length} intercambios`
                        : 'Se abre al avanzar en el curso'}
                    </span>
                  </span>
                </MirabiCard>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Screen>
  )
}
