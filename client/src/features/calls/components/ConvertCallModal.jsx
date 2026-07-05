import { useState } from 'react'
import { UserPlus, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { useConvertCallMutation } from '../callsApi'

/** Turns an orphan (no-lead) call into a new Lead or Opportunity. */
export function ConvertCallModal({ call, onClose, onConverted }) {
  const [convertCall, { isLoading }] = useConvertCallMutation()
  const [pending, setPending] = useState(null) // 'lead' | 'opportunity'

  if (!call) return null

  const convert = async (type) => {
    try {
      setPending(type)
      const res = await convertCall({ id: call.id, type }).unwrap()
      if (res?.data?.created === false) {
        toast.success('Number already belongs to a lead — call linked to it')
      } else {
        toast.success(type === 'opportunity' ? 'Opportunity created' : 'Lead created')
      }
      onConverted?.(res?.data)
      onClose()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not convert this call')
    } finally {
      setPending(null)
    }
  }

  return (
    <Modal
      open={Boolean(call)}
      onClose={onClose}
      title="Convert this call"
      description={call.callerName || call.phoneNumber || 'Unknown caller'}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => convert('lead')}
          className="flex flex-col items-start gap-2 rounded-xl border border-surface-border p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <UserPlus className="h-4.5 w-4.5" />
          </span>
          <span className="text-sm font-semibold text-ink">{pending === 'lead' ? 'Creating…' : 'Create lead'}</span>
          <span className="text-xs text-ink-muted">Adds a new lead from this caller's name and number.</span>
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => convert('opportunity')}
          className="flex flex-col items-start gap-2 rounded-xl border border-surface-border p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <Briefcase className="h-4.5 w-4.5" />
          </span>
          <span className="text-sm font-semibold text-ink">{pending === 'opportunity' ? 'Creating…' : 'Create opportunity'}</span>
          <span className="text-xs text-ink-muted">Same, but goes straight into the opportunities pipeline.</span>
        </button>
      </div>
    </Modal>
  )
}
