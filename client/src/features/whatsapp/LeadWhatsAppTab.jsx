import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { digitsOnlyE164, inferE164FromStored, mergePartsToE164 } from '@/utils/phoneNumbers'
import {
  useGetWhatsAppSettingsQuery,
  useGetWhatsAppConversationsQuery,
  useCreateWhatsAppConversationMutation,
} from '@/features/whatsapp/whatsappApi'
import { WhatsAppThreadPane } from '@/features/whatsapp/inbox/WhatsAppThreadPane'
import { WhatsAppIcon } from '@/features/whatsapp/WhatsAppIcon'

/** Read-only-ish embed of the /whatsapp thread view, scoped to one lead/opportunity. */
export function LeadWhatsAppTab({ leadId, lead }) {
  const navigate = useNavigate()
  const contactName = lead?.fullName || lead?.title || lead?.contactName || ''

  const whatsappE164 = useMemo(
    () => inferE164FromStored(lead?.profileMeta?.whatsappNumber, lead?.country),
    [lead?.profileMeta?.whatsappNumber, lead?.country],
  )
  const phoneE164 = useMemo(() => mergePartsToE164(lead?.phoneCountryCode, lead?.phone), [lead?.phoneCountryCode, lead?.phone])
  const phoneDigits = useMemo(() => {
    if (whatsappE164) return digitsOnlyE164(whatsappE164)
    if (phoneE164) return digitsOnlyE164(phoneE164)
    return String(lead?.profileMeta?.whatsappNumber || lead?.phone || '').replace(/\D/g, '')
  }, [whatsappE164, phoneE164, lead?.profileMeta?.whatsappNumber, lead?.phone])

  const { data: settingsData, isLoading: loadingSettings } = useGetWhatsAppSettingsQuery()
  const connected = settingsData?.data?.status === 'verified'

  const { data: conversationsRes, isLoading: loadingConversation } = useGetWhatsAppConversationsQuery(
    { leadId },
    { skip: !connected || !leadId, pollingInterval: 20000 },
  )
  const conversation = conversationsRes?.data?.[0] || null

  const [createConversation, { isLoading: starting }] = useCreateWhatsAppConversationMutation()

  async function handleStart() {
    try {
      await createConversation({ phoneNumber: phoneDigits, contactName: contactName || undefined, leadId }).unwrap()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not start conversation')
    }
  }

  return (
    <div className="lf-wa-theme mt-4">
      <div className="flex h-[calc(100dvh-205px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
        {loadingSettings || (connected && loadingConversation) ? null : !connected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full" style={{ backgroundColor: 'var(--wa-green)' }}>
              <WhatsAppIcon className="h-7 w-7 text-white" />
            </div>
            <p className="max-w-md text-sm font-semibold text-ink">Connect WhatsApp Business API</p>
            <p className="max-w-lg text-sm text-ink-muted">
              Connect your company's WhatsApp Business number in Integrations to see this lead's WhatsApp messages here.
            </p>
            <button
              type="button"
              className="h-10 rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition-colors"
              style={{ backgroundColor: 'var(--wa-accent)' }}
              onClick={() => navigate('/integrations')}
            >
              Open Integrations
            </button>
          </div>
        ) : conversation ? (
          <WhatsAppThreadPane key={conversation.id} conversation={conversation} onBack={() => {}} hideActions />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full" style={{ backgroundColor: 'var(--wa-panel)' }}>
              <WhatsAppIcon className="h-7 w-7 text-[var(--wa-green)]" />
            </div>
            {phoneDigits ? (
              <>
                <p className="text-sm font-semibold text-ink">No WhatsApp conversation yet</p>
                <p className="max-w-md text-sm text-ink-muted">Start a conversation with +{phoneDigits}.</p>
                <button
                  type="button"
                  disabled={starting}
                  onClick={handleStart}
                  className="h-10 rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
                  style={{ backgroundColor: 'var(--wa-accent)' }}
                >
                  {starting ? 'Starting…' : 'Start WhatsApp conversation'}
                </button>
              </>
            ) : (
              <p className="max-w-md text-sm text-ink-muted">Add a phone number to this lead to start a WhatsApp conversation.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
