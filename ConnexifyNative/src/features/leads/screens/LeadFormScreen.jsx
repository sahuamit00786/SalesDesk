import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import TextField from '../../../design-system/components/TextField';
import SelectField from '../../../design-system/components/SelectField';
import DateField from '../../../design-system/components/DateField';
import Button from '../../../design-system/components/Button';
import Card from '../../../design-system/components/Card';
import { Skeleton } from '../../../design-system/components/Skeleton';
import { User, Phone, Mail, Building, DollarSign, MessageCircle } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useLeadFormMeta, useLeadMutations, useLeadDetail } from '../hooks';
import { STATUS_LABELS, STATUS_OPTIONS } from '../constants';

function customFieldType(def) {
  return String(def.fieldType || def.type || 'text').toLowerCase();
}

function customFieldOptions(def) {
  const raw = def.options;
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
  return list.map((o) => (typeof o === 'object' ? { value: String(o.value ?? o.label), label: String(o.label ?? o.value) } : { value: String(o), label: String(o) }));
}

export default function LeadFormScreen({ navigation, route }) {
  const theme = useTheme();
  const mode = route.params?.leadId ? 'edit' : 'add';
  const leadId = route.params?.leadId;

  const formMeta = useLeadFormMeta();
  const detail = useLeadDetail(mode === 'edit' ? leadId : null);
  const seedLead = route.params?.lead || detail.data?.lead;
  const { create, update } = useLeadMutations();

  const meta = formMeta.data || {};
  const customDefs = meta.customFields || [];

  const initial = useMemo(() => {
    const cfValues = {};
    (seedLead?.customFieldValues || []).forEach((cf) => {
      cfValues[cf.fieldId || cf.customFieldId || cf.field?.id] = cf.value;
    });
    return {
      contactName: seedLead?.contactName || seedLead?.title || '',
      phone: seedLead?.phone || '',
      email: seedLead?.email || '',
      company: seedLead?.company || '',
      designation: seedLead?.designation || '',
      sourceId: seedLead?.sourceId || null,
      status: seedLead?.status || 'new',
      value: seedLead?.value != null && Number(seedLead.value) > 0 ? String(seedLead.value) : '',
      assignedTo: seedLead?.assignedTo || null,
      whatsappNumber: seedLead?.profileMeta?.whatsappNumber || '',
      closingDate: seedLead?.closingDate || null,
      street: seedLead?.street || '',
      city: seedLead?.city || '',
      state: seedLead?.state || '',
      country: seedLead?.country || '',
      postalCode: seedLead?.postalCode || '',
      requirement: seedLead?.requirement || '',
      customFields: cfValues,
    };
  }, [seedLead]);

  const [form, setFormState] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const seededRef = React.useRef(false);

  // Re-seed once when edit data arrives after mount
  React.useEffect(() => {
    if (mode === 'edit' && seedLead && !seededRef.current) {
      seededRef.current = true;
      setFormState(initial);
    }
  }, [seedLead, initial, mode]);

  const setField = (key, value) => {
    setFormState((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const setCustomField = (id, value) =>
    setFormState((f) => ({ ...f, customFields: { ...f.customFields, [id]: value } }));

  const validate = () => {
    const next = {};
    if (!form.contactName.trim()) next.contactName = 'Name is required';
    if (!form.phone.trim()) next.phone = 'Phone is required';
    if (!form.sourceId) next.sourceId = 'Source is required';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    customDefs.forEach((def) => {
      const v = form.customFields[def.id];
      if (def.required && (v === undefined || v === null || String(v).trim() === '')) {
        next[`cf_${def.id}`] = `${def.label || def.name} is required`;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const payload = {
      title: form.contactName.trim(),
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      company: form.company.trim() || null,
      designation: form.designation.trim() || null,
      sourceId: form.sourceId,
      source: seedLead?.source || 'manual',
      status: form.status,
      value: form.value ? Number(form.value) : null,
      assignedTo: form.assignedTo || null,
      closingDate: form.closingDate ? new Date(form.closingDate).toISOString() : null,
      street: form.street.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || null,
      postalCode: form.postalCode.trim() || null,
      requirement: form.requirement.trim() || null,
      profileMeta: { ...(seedLead?.profileMeta || {}), whatsappNumber: form.whatsappNumber.trim() || null },
      customFields: form.customFields,
    };
    try {
      setBusy(true);
      if (mode === 'edit') {
        await update.mutateAsync({ id: leadId, body: payload });
        Toast.show({ type: 'success', text1: 'Lead updated' });
      } else {
        await create.mutateAsync({ ...payload, isOpportunity: false });
        Toast.show({ type: 'success', text1: 'Lead created' });
      }
      navigation.goBack();
    } catch {
      // mutation hook shows the error toast
    } finally {
      setBusy(false);
    }
  };

  const metaLoading = formMeta.isPending || (mode === 'edit' && detail.isPending && !seedLead);
  const s = styles(theme);

  return (
    <ScreenScaffold>
      <AppHeader title={mode === 'edit' ? 'Edit lead' : 'New lead'} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {metaLoading ? (
          <View style={s.loadingPad}>
            <Skeleton height={48} />
            <Skeleton height={48} style={s.gap} />
            <Skeleton height={48} style={s.gap} />
            <Skeleton height={48} style={s.gap} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Card style={s.section}>
              <AppText variant="captionStrong" color="inkFaint" style={s.sectionTitle}>
                CONTACT
              </AppText>
              <TextField label="Full name *" value={form.contactName} onChangeText={(v) => setField('contactName', v)} icon={User} placeholder="Jane Cooper" error={errors.contactName} style={s.field} />
              <TextField label="Phone *" value={form.phone} onChangeText={(v) => setField('phone', v)} icon={Phone} placeholder="98765 43210" keyboardType="phone-pad" error={errors.phone} style={s.field} />
              <TextField label="Email" value={form.email} onChangeText={(v) => setField('email', v)} icon={Mail} placeholder="jane@company.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} style={s.field} />
              <TextField label="WhatsApp" value={form.whatsappNumber} onChangeText={(v) => setField('whatsappNumber', v)} icon={MessageCircle} placeholder="Same as phone if empty" keyboardType="phone-pad" style={s.field} />
              <TextField label="Company" value={form.company} onChangeText={(v) => setField('company', v)} icon={Building} placeholder="Acme Inc" style={s.field} />
              <TextField label="Designation" value={form.designation} onChangeText={(v) => setField('designation', v)} placeholder="Head of Sales" style={s.fieldLast} />
            </Card>

            <Card style={s.section}>
              <AppText variant="captionStrong" color="inkFaint" style={s.sectionTitle}>
                PIPELINE
              </AppText>
              <SelectField
                label="Source *"
                value={form.sourceId}
                onChange={(v) => setField('sourceId', v)}
                options={(meta.sources || []).map((src) => ({ value: src.id, label: src.name }))}
                error={errors.sourceId}
                style={s.field}
              />
              <SelectField
                label="Status"
                value={form.status}
                onChange={(v) => setField('status', v)}
                options={STATUS_OPTIONS.map((v) => ({ value: v, label: STATUS_LABELS[v] }))}
                style={s.field}
              />
              <SelectField
                label="Assigned to"
                value={form.assignedTo}
                onChange={(v) => setField('assignedTo', v)}
                options={(meta.users || []).map((u) => ({ value: u.id, label: u.name, description: u.email }))}
                searchable
                style={s.field}
              />
              <View style={s.row}>
                <TextField label={`Value (${theme.currency})`} value={form.value} onChangeText={(v) => setField('value', v.replace(/[^\d.]/g, ''))} icon={DollarSign} placeholder="0" keyboardType="numeric" style={s.rowItem} />
                <DateField label="Closing date" value={form.closingDate} onChange={(v) => setField('closingDate', v)} clearable style={s.rowItem} />
              </View>
              <TextField label="Requirement" value={form.requirement} onChangeText={(v) => setField('requirement', v)} placeholder="What are they looking for?" multiline style={s.fieldLast} />
            </Card>

            <Card style={s.section}>
              <AppText variant="captionStrong" color="inkFaint" style={s.sectionTitle}>
                ADDRESS
              </AppText>
              <TextField label="Street" value={form.street} onChangeText={(v) => setField('street', v)} style={s.field} />
              <View style={s.row}>
                <TextField label="City" value={form.city} onChangeText={(v) => setField('city', v)} style={s.rowItem} />
                <TextField label="State" value={form.state} onChangeText={(v) => setField('state', v)} style={s.rowItem} />
              </View>
              <View style={s.row}>
                <TextField label="Country" value={form.country} onChangeText={(v) => setField('country', v)} style={s.rowItem} />
                <TextField label="Postal code" value={form.postalCode} onChangeText={(v) => setField('postalCode', v)} style={s.rowItem} />
              </View>
            </Card>

            {customDefs.length ? (
              <Card style={s.section}>
                <AppText variant="captionStrong" color="inkFaint" style={s.sectionTitle}>
                  CUSTOM FIELDS
                </AppText>
                {customDefs.map((def) => {
                  const type = customFieldType(def);
                  const label = `${def.label || def.name}${def.required ? ' *' : ''}`;
                  const value = form.customFields[def.id];
                  const error = errors[`cf_${def.id}`];
                  if (type === 'select' || type === 'dropdown' || type === 'radio') {
                    return (
                      <SelectField key={def.id} label={label} value={value ?? null} onChange={(v) => setCustomField(def.id, v)} options={customFieldOptions(def)} error={error} style={s.field} />
                    );
                  }
                  if (type === 'date') {
                    return (
                      <DateField key={def.id} label={label} value={value || null} onChange={(v) => setCustomField(def.id, v ? v.toISOString() : null)} clearable error={error} style={s.field} />
                    );
                  }
                  if (type === 'checkbox' || type === 'boolean') {
                    return (
                      <SelectField key={def.id} label={label} value={value === true || value === 'true' ? 'yes' : value === false || value === 'false' ? 'no' : null} onChange={(v) => setCustomField(def.id, v === 'yes')} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} error={error} style={s.field} />
                    );
                  }
                  return (
                    <TextField
                      key={def.id}
                      label={label}
                      value={value == null ? '' : String(value)}
                      onChangeText={(v) => setCustomField(def.id, v)}
                      keyboardType={type === 'number' ? 'numeric' : 'default'}
                      multiline={type === 'textarea'}
                      error={error}
                      style={s.field}
                    />
                  );
                })}
              </Card>
            ) : null}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      {!metaLoading ? (
        <View style={[s.submitBar, { backgroundColor: theme.colors.page, borderTopColor: theme.colors.divider }]}>
          <Button title={mode === 'edit' ? 'Save changes' : 'Create lead'} size="lg" fullWidth loading={busy} onPress={submit} />
        </View>
      ) : null}
    </ScreenScaffold>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    loadingPad: { padding: 16 },
    gap: { marginTop: 12 },
    scroll: { padding: 16, paddingBottom: 24 },
    section: { marginBottom: 14 },
    sectionTitle: { letterSpacing: 0.8, marginBottom: 12 },
    field: { marginBottom: 14 },
    fieldLast: { marginBottom: 2 },
    row: { flexDirection: 'row', gap: 12 },
    rowItem: { flex: 1, marginBottom: 14 },
    submitBar: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  });
