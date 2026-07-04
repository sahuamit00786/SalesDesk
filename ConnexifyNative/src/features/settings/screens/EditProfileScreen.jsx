import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import Card from '../../../design-system/components/Card';
import TextField from '../../../design-system/components/TextField';
import Button from '../../../design-system/components/Button';
import { User, Phone, MessageCircle } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useAuthStore } from '../../../stores/authStore';
import { useTeamMutations } from '../../team/hooks';

// Server only exposes PATCH /team/users/:id/profile (team:admin) — this screen is
// reachable for company admins editing their own profile.
export default function EditProfileScreen({ navigation }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const { patchProfile } = useTeamMutations();

  const [form, setForm] = useState({
    name: user?.name || '',
    jobTitle: user?.jobTitle || '',
    department: user?.department || '',
    businessPhone: user?.businessPhone || '',
    whatsappNumber: user?.whatsappNumber || '',
    city: user?.city || '',
    country: user?.country || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Name is required' });
      return;
    }
    try {
      setBusy(true);
      await patchProfile.mutateAsync({ id: user.id, body: { ...form, name: form.name.trim() } });
      await refreshMe();
      Toast.show({ type: 'success', text1: 'Profile updated' });
      navigation.goBack();
    } catch {
      // hook toasts
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScaffold>
      <AppHeader title="Edit profile" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card style={styles.card}>
            <TextField label="Full name" value={form.name} onChangeText={(v) => set('name', v)} icon={User} style={styles.field} />
            <TextField label="Job title" value={form.jobTitle} onChangeText={(v) => set('jobTitle', v)} style={styles.field} />
            <TextField label="Department" value={form.department} onChangeText={(v) => set('department', v)} style={styles.field} />
            <TextField label="Phone" value={form.businessPhone} onChangeText={(v) => set('businessPhone', v)} icon={Phone} keyboardType="phone-pad" style={styles.field} />
            <TextField label="WhatsApp" value={form.whatsappNumber} onChangeText={(v) => set('whatsappNumber', v)} icon={MessageCircle} keyboardType="phone-pad" style={styles.field} />
            <View style={styles.row}>
              <TextField label="City" value={form.city} onChangeText={(v) => set('city', v)} style={styles.rowItem} />
              <TextField label="Country" value={form.country} onChangeText={(v) => set('country', v)} style={styles.rowItem} />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.submitBar, { backgroundColor: theme.colors.page, borderTopColor: theme.colors.divider }]}>
        <Button title="Save changes" size="lg" fullWidth loading={busy} onPress={submit} />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16 },
  card: {},
  field: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1, marginBottom: 2 },
  submitBar: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
});
