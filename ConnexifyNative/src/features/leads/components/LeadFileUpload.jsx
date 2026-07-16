import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import Toast from 'react-native-toast-message';
import Button from '../../../design-system/components/Button';
import { useLeadDocumentMutations } from '../hooks';

/**
 * "Attach file" action for the lead Files tab.
 *
 * Uploads through the same Documents module the web app's lead "Documents" tab
 * reads from (linked via { entityType: 'lead', entityId: leadId }), so files
 * attached here actually show up — on this screen after refetch, and on web.
 */

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'bmp'];
const MAX_MB = 5; // server multer limit for /documents (memoryStorage, 5MB)

function fileTypeFor(name) {
  const ext = String(name || '').split('.').pop().toLowerCase();
  return IMAGE_EXTS.includes(ext) ? 'Image' : 'Other';
}

export default function LeadFileUpload({ leadId, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const { upload } = useLeadDocumentMutations(leadId);

  const pickAndUpload = async () => {
    let picked;
    try {
      picked = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });
    } catch (err) {
      if (DocumentPicker.isCancel(err)) return;
      Toast.show({ type: 'error', text1: 'Could not open the file picker' });
      return;
    }

    const tooBig = picked.find((f) => (f.size || 0) > MAX_MB * 1024 * 1024);
    if (tooBig) {
      Toast.show({
        type: 'error',
        text1: 'File too large',
        text2: `${tooBig.name} is over ${MAX_MB} MB. Choose a smaller file.`,
      });
      return;
    }

    setBusy(true);
    let uploaded = 0;
    for (const f of picked) {
      const file = { uri: f.fileCopyUri || f.uri, name: f.name, type: f.type || 'application/octet-stream' };
      try {
        // eslint-disable-next-line no-await-in-loop
        await upload.mutateAsync({ file, name: f.name, fileType: fileTypeFor(f.name) });
        uploaded += 1;
      } catch {
        // error toast already raised by the mutation hook
      }
    }
    setBusy(false);

    if (uploaded) {
      Toast.show({
        type: 'success',
        text1: uploaded === 1 ? 'File attached' : `${uploaded} of ${picked.length} files attached`,
      });
      onUploaded?.();
    }
  };

  return (
    <View style={styles.wrap}>
      <Button title={busy ? 'Uploading…' : 'Attach file'} onPress={pickAndUpload} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 8 },
});
