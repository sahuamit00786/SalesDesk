import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { SkeletonForm } from '@/components/shared/SkeletonLoader'
import { FieldPalette } from '../components/builder/FieldPalette'
import { FieldSettingsPanel } from '../components/builder/FieldSettingsPanel'
import { FormCanvas } from '../components/builder/FormCanvas'
import { EmailTemplateDrawer } from '../components/builder/EmailTemplateDrawer'
import { FormLivePreview } from '../components/builder/FormLivePreview'
import { FormSettingsPanel } from '../components/builder/FormSettingsPanel'
import { reorderFields } from '../components/builder/reorderFields'
import {
  useCreateWebFormEmailTemplateMutation,
  useCreateWebFormMutation,
  useDeleteWebFormEmailTemplateMutation,
  useGenerateWebFormEmailTemplateMutation,
  useGetWebFormEmailTemplatesQuery,
  useGetWebFormQuery,
  useUpdateWebFormEmailTemplateMutation,
  useUpdateWebFormMutation,
} from '../webFormsApi'

const NEW_FORM_DRAFT = {
  name: 'Untitled form',
  formTitle: 'Let us connect',
  status: 'draft',
  submitButtonText: 'Submit',
  primaryColor: '#3b73f5',
  textColor: '#0f1117',
  backgroundColor: '#ffffff',
  formWidth: 760,
  thankyouType: 'message',
  displayType: 'inline',
}

const FIELD_DEFAULTS = {
  heading: { label: 'Your Heading Here' },
  paragraph: { label: 'Enter your paragraph text here.' },
  hidden: { label: '', crmField: '', defaultValue: '' },
  file: { label: 'Upload file', options: { accept: '', maxFiles: 1, maxFileSizeMB: 10 } },
}

function createField(type, order) {
  const defaults = FIELD_DEFAULTS[type] || {}
  return { id: crypto.randomUUID(), type, label: '', placeholder: '', isRequired: false, order, width: 'full', ...defaults }
}

export function FormBuilderPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { data, isLoading } = useGetWebFormQuery(id, { skip: isNew })
  const [createWebForm, { isLoading: creating }] = useCreateWebFormMutation()
  const [updateWebForm, { isLoading: updating }] = useUpdateWebFormMutation()
  const saving = creating || updating
  const [generateTemplate, { isLoading: generatingTemplate }] = useGenerateWebFormEmailTemplateMutation()
  const { data: templateData } = useGetWebFormEmailTemplatesQuery()
  const [createEmailTemplate, { isLoading: savingTemplate }] = useCreateWebFormEmailTemplateMutation()
  const [updateEmailTemplate, { isLoading: updatingTemplate }] = useUpdateWebFormEmailTemplateMutation()
  const [deleteEmailTemplate, { isLoading: deletingTemplate }] = useDeleteWebFormEmailTemplateMutation()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activePaletteType, setActivePaletteType] = useState(null)
  const [centerMode, setCenterMode] = useState('builder')
  const [localFields, setLocalFields] = useState(null)
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [localForm, setLocalForm] = useState(null)
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const nameInputRef = useRef(null)

  useEffect(() => {
    setLocalFields(null)
    setLocalForm(null)
    setSelectedFieldId(null)
    setCenterMode('builder')
    setEditingName(false)
    setNameDraft('')
  }, [id])

  const form = isNew ? localForm || NEW_FORM_DRAFT : localForm || data?.data?.form || null
  const fields = useMemo(() => localFields || form?.fields || [], [localFields, form?.fields])
  const selectedField = useMemo(() => fields.find((f) => f.id === selectedFieldId) || null, [fields, selectedFieldId])
  const templates = templateData?.data?.items || []

  function patchField(fieldId, changes) {
    setLocalFields((prev) => (prev || fields).map((f) => (f.id === fieldId ? { ...f, ...changes } : f)))
  }

  function startEditingName() {
    setNameDraft((localForm || form)?.name || '')
    setEditingName(true)
    requestAnimationFrame(() => nameInputRef.current?.focus())
  }

  function cancelEditingName() {
    setEditingName(false)
    setNameDraft('')
  }

  function commitFormName() {
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      toast.error('Form name is required')
      return
    }
    setLocalForm({ ...(localForm || form), name: trimmed })
    setEditingName(false)
    setNameDraft('')
  }

  async function save() {
    if (!form) return
    const payload = { ...(localForm || form), fields }
    delete payload.id

    if (isNew) {
      const created = await createWebForm(payload).unwrap()
      toast.success('Form saved')
      navigate(`/forms/${created.data.id}/builder`, { replace: true })
      return
    }

    await updateWebForm({ id: form.id, ...payload }).unwrap()
    toast.success('Form saved')
    setLocalForm(null)
    setLocalFields(null)
  }

  async function generateEmailTemplate() {
    const result = await generateTemplate({
      objective: 'Generate a confirmation email template for web form submission',
      formName: (localForm || form)?.name || 'Web Form',
    }).unwrap()
    setLocalForm((prev) => ({
      ...((prev || form) || {}),
      sendConfirmationEmail: true,
      confirmationSubject: result?.data?.subject || '',
      confirmationBody: result?.data?.bodyHtml || '',
    }))
    toast.success('Email template generated')
    return result?.data || {}
  }

  function selectTemplate(templateId) {
    setSelectedTemplateId(templateId)
    const selected = templates.find((item) => item.id === templateId)
    if (!selected) return
    setLocalForm((prev) => ({
      ...((prev || form) || {}),
      sendConfirmationEmail: true,
      confirmationSubject: selected.subject || '',
      confirmationBody: selected.body || '',
    }))
    toast.success('Template selected')
  }

  if (!isNew && (isLoading || !form)) {
    return <PageShell><div className="p-4"><SkeletonForm rows={6} /></div></PageShell>
  }

  return (
    <PageShell fullWidth>
      <div className="space-y-4 px-4 pt-6">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-surface-border bg-white px-4 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {editingName ? (
              <>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitFormName()
                    }
                    if (e.key === 'Escape') cancelEditingName()
                  }}
                  className="min-w-0 flex-1 border-0 border-b-2 border-brand-500 bg-transparent pb-0.5 text-lg font-semibold text-ink outline-none ring-0 focus:border-brand-600"
                  aria-label="Form name"
                />
                <button
                  type="button"
                  onClick={commitFormName}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
                  title="Save form name"
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startEditingName}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  title="Edit form name"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
                <h1 className="truncate text-lg font-semibold text-ink">{form.name || 'Form Builder'}</h1>
              </>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => navigate('/forms')} className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm">Back</button>
            <button type="button" onClick={save} disabled={saving} className="h-10 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white">Save</button>
          </div>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => {
            const dragType = event.active.data.current?.type
            if (event.active.id?.toString().startsWith('palette:') && dragType) setActivePaletteType(dragType)
          }}
          onDragEnd={(event) => {
            const { active, over } = event
            setActivePaletteType(null)
            if (!over) return
            const sourceType = active.data.current?.type
            if (active.id?.toString().startsWith('palette:') && sourceType) {
              const nextFields = [...fields, createField(sourceType, fields.length)]
              setLocalFields(nextFields)
              return
            }
            if (active.id !== over.id) setLocalFields(reorderFields(fields, active.id, over.id))
          }}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
            <FieldPalette />
            <div className="space-y-3">
              <div className="inline-flex rounded-xl border border-surface-border bg-white p-1">
                <button type="button" className={`h-9 rounded-lg px-3 text-sm ${centerMode === 'builder' ? 'bg-[var(--brand-primary)] text-white' : 'text-ink-muted'}`} onClick={() => setCenterMode('builder')}>Builder</button>
                <button type="button" className={`h-9 rounded-lg px-3 text-sm ${centerMode === 'preview' ? 'bg-[var(--brand-primary)] text-white' : 'text-ink-muted'}`} onClick={() => setCenterMode('preview')}>Live preview</button>
              </div>
              {centerMode === 'builder' ? (
                <FormCanvas
                  fields={fields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={setSelectedFieldId}
                  onDeleteField={(fieldId) => setLocalFields(fields.filter((f) => f.id !== fieldId))}
                  onDuplicateField={(fieldId) => {
                    const current = fields.find((f) => f.id === fieldId)
                    if (!current) return
                    setLocalFields([...fields, { ...current, id: crypto.randomUUID(), order: fields.length }])
                  }}
                />
              ) : (
                <FormLivePreview form={localForm || form} fields={fields} />
              )}
            </div>
            {selectedField ? (
              <FieldSettingsPanel field={selectedField} onChange={(changes) => patchField(selectedField.id, changes)} />
            ) : (
              <FormSettingsPanel
                form={localForm || form}
                onChange={(changes) => setLocalForm({ ...(localForm || form), ...changes })}
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={selectTemplate}
                onOpenTemplateDrawer={() => setTemplateDrawerOpen(true)}
              />
            )}
          </div>
          <DragOverlay>{activePaletteType ? <div className="rounded-xl border border-brand-300 bg-white px-3 py-2 text-sm shadow-lg">{activePaletteType}</div> : null}</DragOverlay>
        </DndContext>
      </div>
      <EmailTemplateDrawer
        open={templateDrawerOpen}
        onClose={() => setTemplateDrawerOpen(false)}
        formName={(localForm || form)?.name}
        templates={templates}
        onGenerate={generateEmailTemplate}
        generating={generatingTemplate}
        onSaveTemplate={(payload) => createEmailTemplate(payload).unwrap()}
        saving={savingTemplate}
        onUpdateTemplate={(payload) => updateEmailTemplate(payload).unwrap()}
        updating={updatingTemplate}
        onDeleteTemplate={(idValue) => deleteEmailTemplate(idValue).unwrap()}
        deleting={deletingTemplate}
        onApplyTemplate={(payload) => {
          setLocalForm((prev) => ({
            ...((prev || form) || {}),
            sendConfirmationEmail: true,
            confirmationSubject: payload.subject || '',
            confirmationBody: payload.body || '',
          }))
          toast.success('Template applied')
        }}
      />
    </PageShell>
  )
}
