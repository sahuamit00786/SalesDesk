import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Sheet from '../../../design-system/components/Sheet';
import TextField from '../../../design-system/components/TextField';
import SelectField from '../../../design-system/components/SelectField';
import DateField from '../../../design-system/components/DateField';
import Button from '../../../design-system/components/Button';
import { Phone, Mail, Video, StickyNote, CheckSquare } from '../../../design-system/icons';
import { CALL_OUTCOMES } from '../../calls/api';

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Video },
  { value: 'note', label: 'Note', icon: StickyNote },
  { value: 'task', label: 'Task', icon: CheckSquare },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const CALL_DIRECTIONS = [
  { value: 'outbound', label: 'Outgoing' },
  { value: 'inbound', label: 'Incoming' },
];

function useSheetForm(ref, initial) {
  const sheetRef = useRef(null);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  useImperativeHandle(ref, () => ({
    open: () => {
      setForm(initial);
      setBusy(false);
      requestAnimationFrame(() => sheetRef.current?.present());
    },
    close: () => sheetRef.current?.dismiss(),
  }));
  return { sheetRef, form, setForm, busy, setBusy };
}

async function submit({ mutation, body, setBusy, sheetRef, successMsg }) {
  try {
    setBusy(true);
    await mutation.mutateAsync(body);
    Toast.show({ type: 'success', text1: successMsg });
    sheetRef.current?.dismiss();
  } catch {
    // error toast raised by mutation hook
  } finally {
    setBusy(false);
  }
}

export const AddActivitySheet = forwardRef(function AddActivitySheet({ mutation }, ref) {
  const { sheetRef, form, setForm, busy, setBusy } = useSheetForm(ref, { type: 'call', body: '' });
  return (
    <Sheet ref={sheetRef} title="Log activity">
      <SelectField
        label="Type"
        value={form.type}
        onChange={(type) => setForm((f) => ({ ...f, type }))}
        options={ACTIVITY_TYPES}
        style={styles.field}
      />
      <TextField
        label="Details"
        value={form.body}
        onChangeText={(body) => setForm((f) => ({ ...f, body }))}
        placeholder="What happened?"
        multiline
        style={styles.field}
      />
      <Button
        title="Log activity"
        fullWidth
        loading={busy}
        disabled={!form.body.trim()}
        onPress={() =>
          submit({ mutation, body: { type: form.type, body: form.body.trim() }, setBusy, sheetRef, successMsg: 'Activity logged' })
        }
      />
    </Sheet>
  );
});

export const AddCallSheet = forwardRef(function AddCallSheet({ mutation }, ref) {
  const { sheetRef, form, setForm, busy, setBusy } = useSheetForm(ref, {
    callType: 'outbound',
    outcome: 'connected',
    duration: '',
    notes: '',
  });
  return (
    <Sheet ref={sheetRef} title="Log call" scrollable>
      <View style={styles.row}>
        <SelectField
          label="Direction"
          value={form.callType}
          onChange={(callType) => setForm((f) => ({ ...f, callType }))}
          options={CALL_DIRECTIONS}
          style={styles.rowItem}
        />
        <SelectField
          label="Outcome"
          value={form.outcome}
          onChange={(outcome) => setForm((f) => ({ ...f, outcome }))}
          options={CALL_OUTCOMES}
          style={styles.rowItem}
        />
      </View>
      <TextField
        label="Duration (seconds)"
        value={form.duration}
        onChangeText={(duration) => setForm((f) => ({ ...f, duration: duration.replace(/[^0-9]/g, '') }))}
        placeholder="Optional"
        keyboardType="number-pad"
        style={styles.field}
      />
      <TextField
        label="Notes"
        value={form.notes}
        onChangeText={(notes) => setForm((f) => ({ ...f, notes }))}
        placeholder="What was discussed?"
        multiline
        style={styles.field}
      />
      <Button
        title="Log call"
        fullWidth
        loading={busy}
        onPress={() =>
          submit({
            mutation,
            body: {
              callType: form.callType,
              outcome: form.outcome,
              duration: form.duration ? Number(form.duration) : undefined,
              notes: form.notes.trim() || undefined,
            },
            setBusy,
            sheetRef,
            successMsg: 'Call logged',
          })
        }
      />
    </Sheet>
  );
});

export const AddNoteSheet = forwardRef(function AddNoteSheet({ mutation }, ref) {
  const { sheetRef, form, setForm, busy, setBusy } = useSheetForm(ref, { body: '' });
  return (
    <Sheet ref={sheetRef} title="Add note">
      <TextField
        label="Note"
        value={form.body}
        onChangeText={(body) => setForm((f) => ({ ...f, body }))}
        placeholder="Write a note…"
        multiline
        style={styles.field}
      />
      <Button
        title="Save note"
        fullWidth
        loading={busy}
        disabled={!form.body.trim()}
        onPress={() => submit({ mutation, body: { body: form.body.trim() }, setBusy, sheetRef, successMsg: 'Note added' })}
      />
    </Sheet>
  );
});

export const AddTaskSheet = forwardRef(function AddTaskSheet({ mutation }, ref) {
  const { sheetRef, form, setForm, busy, setBusy } = useSheetForm(ref, {
    title: '',
    dueAt: null,
    priority: 'medium',
    description: '',
  });
  return (
    <Sheet ref={sheetRef} title="Add task" scrollable>
      <TextField
        label="Title"
        value={form.title}
        onChangeText={(title) => setForm((f) => ({ ...f, title }))}
        placeholder="Follow up on proposal"
        style={styles.field}
      />
      <View style={styles.row}>
        <DateField
          label="Due"
          mode="datetime"
          value={form.dueAt}
          onChange={(dueAt) => setForm((f) => ({ ...f, dueAt }))}
          style={styles.rowItem}
        />
        <SelectField
          label="Priority"
          value={form.priority}
          onChange={(priority) => setForm((f) => ({ ...f, priority }))}
          options={PRIORITIES}
          style={styles.rowItem}
        />
      </View>
      <TextField
        label="Description"
        value={form.description}
        onChangeText={(description) => setForm((f) => ({ ...f, description }))}
        placeholder="Optional details"
        multiline
        style={styles.field}
      />
      <Button
        title="Add task"
        fullWidth
        loading={busy}
        disabled={!form.title.trim()}
        onPress={() =>
          submit({
            mutation,
            body: {
              title: form.title.trim(),
              description: form.description.trim() || undefined,
              priority: form.priority,
              dueAt: form.dueAt ? form.dueAt.toISOString() : undefined,
            },
            setBusy,
            sheetRef,
            successMsg: 'Task added',
          })
        }
      />
    </Sheet>
  );
});

export const AddFollowupSheet = forwardRef(function AddFollowupSheet({ mutation }, ref) {
  const { sheetRef, form, setForm, busy, setBusy } = useSheetForm(ref, { dueAt: null, note: '' });
  return (
    <Sheet ref={sheetRef} title="Schedule follow-up">
      <DateField
        label="When"
        mode="datetime"
        value={form.dueAt}
        onChange={(dueAt) => setForm((f) => ({ ...f, dueAt }))}
        style={styles.field}
      />
      <TextField
        label="Note"
        value={form.note}
        onChangeText={(note) => setForm((f) => ({ ...f, note }))}
        placeholder="What to follow up on?"
        multiline
        style={styles.field}
      />
      <Button
        title="Schedule"
        fullWidth
        loading={busy}
        disabled={!form.dueAt}
        onPress={() =>
          submit({
            mutation,
            body: { dueAt: form.dueAt?.toISOString(), note: form.note.trim() || undefined },
            setBusy,
            sheetRef,
            successMsg: 'Follow-up scheduled',
          })
        }
      />
    </Sheet>
  );
});

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  rowItem: { flex: 1, marginBottom: 14 },
});
