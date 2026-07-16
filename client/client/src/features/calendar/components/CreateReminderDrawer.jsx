import { useState } from 'react'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Bell, Calendar, Clock, AlignLeft, Tag, X } from '@/components/ui/icons'
import { format, addHours } from 'date-fns'
import { cn } from '@/utils/cn'
import { useCreateReminderMutation } from '@/features/reminders/remindersApi'
import toast from 'react-hot-toast'

const PRESET_COLORS = [
  '#f43f5e', // rose
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
]

export function CreateReminderDrawer({ isOpen, onClose, initialDate = new Date() }) {
  const [createReminder, { isLoading }] = useCreateReminderMutation()

  const [form, setForm] = useState({
    title: '',
    notes: '',
    remindAt: format(addHours(initialDate, 1), "yyyy-MM-dd'T'HH:mm"),
    color: '#f43f5e',
    channelPush: true,
    channelEmail: true,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.title.trim()) {
      toast.error('Please enter a title')
      return
    }

    try {
      await createReminder({
        title: form.title,
        notes: form.notes,
        remindAt: new Date(form.remindAt).toISOString(),
        color: form.color,
        channelPush: form.channelPush,
        channelEmail: form.channelEmail,
        targetType: 'general',
      }).unwrap()

      toast.success('Reminder created')
      onClose()
      setForm({
        title: '',
        notes: '',
        remindAt: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
        color: '#f43f5e',
        channelPush: true,
        channelEmail: true,
      })
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create reminder')
    }
  }

  return (
    <RightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Reminder"
      description="Add a new reminder to your calendar"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-400" />
            Title
          </label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Enter reminder title..."
            className="w-full"
          />
        </div>

        {/* Date & Time */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            When
          </label>
          <Input
            type="datetime-local"
            value={form.remindAt}
            onChange={(e) => setForm({ ...form, remindAt: e.target.value })}
            className="w-full"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-gray-400" />
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Add details..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 resize-none"
          />
        </div>

        {/* Color picker */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setForm({ ...form, color })}
                className={cn(
                  'w-8 h-8 rounded-lg transition-all',
                  form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Notification channels */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Notifications
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.channelPush}
                onChange={(e) => setForm({ ...form, channelPush: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-600">Push notification</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.channelEmail}
                onChange={(e) => setForm({ ...form, channelEmail: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-600">Email notification</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
          >
            Create Reminder
          </Button>
        </div>
      </form>
    </RightDrawer>
  )
}
