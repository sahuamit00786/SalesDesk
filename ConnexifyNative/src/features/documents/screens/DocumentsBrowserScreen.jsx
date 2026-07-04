import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import DocumentPicker from 'react-native-document-picker';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card, { PressableCard } from '../../../design-system/components/Card';
import SearchBar from '../../../design-system/components/SearchBar';
import FAB from '../../../design-system/components/FAB';
import Sheet from '../../../design-system/components/Sheet';
import TextField from '../../../design-system/components/TextField';
import Button from '../../../design-system/components/Button';
import ProgressBar from '../../../design-system/components/ProgressBar';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import ConfirmSheet from '../../../design-system/components/ConfirmSheet';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import {
  Folder,
  FolderPlus,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileAudio,
  FileVideo,
  Upload,
  ChevronRight,
  Pencil,
  Trash2,
  ExternalLink,
  Home,
} from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { keys } from '../../../api/queryKeys';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { documentsApi, fileUrl } from '../api';
import { relativeTime } from '../../../utils/format';

function iconForName(name) {
  const ext = String(name || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return FileImage;
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return FileText;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (['zip', 'rar', '7z'].includes(ext)) return FileArchive;
  if (['mp3', 'wav', 'm4a'].includes(ext)) return FileAudio;
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return FileVideo;
  return File;
}

function formatSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const NameSheet = forwardRef(function NameSheet(_, ref) {
  const sheetRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (cfg) => {
      setConfig(cfg);
      setName(cfg.initial || '');
      setBusy(false);
      requestAnimationFrame(() => sheetRef.current?.present());
    },
  }));

  const submit = async () => {
    if (!name.trim()) return;
    try {
      setBusy(true);
      await config?.onSubmit?.(name.trim());
      sheetRef.current?.dismiss();
    } catch {
      // caller toasts
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet ref={sheetRef} title={config?.title}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder={config?.placeholder} style={styles.sheetField} autoFocus />
      <Button title={config?.submitLabel || 'Save'} fullWidth loading={busy} disabled={!name.trim()} onPress={submit} />
    </Sheet>
  );
});

export default function DocumentsBrowserScreen() {
  const theme = useTheme();
  const ws = useWorkspaceId();
  const qc = useQueryClient();
  const [path, setPath] = useState([]); // breadcrumb of {id, name}
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [uploadPct, setUploadPct] = useState(null);
  const nameRef = useRef(null);
  const confirmRef = useRef(null);

  const currentFolder = path[path.length - 1] || null;

  const docs = useQuery({
    queryKey: keys.documents.list(ws, 'all'),
    queryFn: () => documentsApi.list(),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
  const tree = useQuery({
    queryKey: [ws, 'documents', 'folder-tree'],
    queryFn: () => documentsApi.folderTree(),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: keys.documents.all(ws) });
    qc.invalidateQueries({ queryKey: [ws, 'documents', 'folder-tree'] });
  };

  const renameDoc = useMutation({
    mutationFn: ({ id, name }) => documentsApi.rename(id, name),
    onSuccess: invalidate,
    onError: (e) => Toast.show({ type: 'error', text1: 'Rename failed', text2: e?.message }),
  });
  const deleteDoc = useMutation({
    mutationFn: (id) => documentsApi.remove(id),
    onSuccess: invalidate,
    onError: (e) => Toast.show({ type: 'error', text1: 'Delete failed', text2: e?.message }),
  });
  const createFolder = useMutation({
    mutationFn: (body) => documentsApi.createFolder(body),
    onSuccess: invalidate,
    onError: (e) => Toast.show({ type: 'error', text1: 'Folder failed', text2: e?.message }),
  });
  const deleteFolder = useMutation({
    mutationFn: (id) => documentsApi.deleteFolder(id),
    onSuccess: invalidate,
    onError: (e) => Toast.show({ type: 'error', text1: 'Delete failed', text2: e?.message }),
  });

  // Folders at the current level from the tree
  const currentFolders = useMemo(() => {
    let level = tree.data || [];
    for (const crumb of path) {
      const found = level.find((f) => f.id === crumb.id);
      level = found?.children || found?.subfolders || [];
    }
    return level;
  }, [tree.data, path]);

  const currentDocs = useMemo(() => {
    const all = docs.data || [];
    const q = search.trim().toLowerCase();
    if (q) return all.filter((d) => String(d.name).toLowerCase().includes(q));
    return all.filter((d) => {
      const folderIds = (d.folders || d.documentFolders || []).map((f) => f.id || f.folderId);
      if (!currentFolder) return folderIds.length === 0 || d.folderId == null ? !d.folderId && folderIds.length === 0 : false;
      return d.folderId === currentFolder.id || folderIds.includes(currentFolder.id);
    });
  }, [docs.data, currentFolder, search]);

  const openDocument = async (doc) => {
    try {
      const { data } = await documentsApi.viewerMeta(doc.id);
      const url = fileUrl(data?.filePath || doc.filePath);
      if (!url) throw new Error('No file URL');
      await Linking.openURL(url);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Could not open file', text2: e?.message });
    }
  };

  const pickAndUpload = async () => {
    try {
      const res = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.allFiles], copyTo: 'cachesDirectory' });
      const file = { uri: res.fileCopyUri || res.uri, name: res.name || 'file', type: res.type || 'application/octet-stream' };
      if (res.size && res.size > 25 * 1024 * 1024) {
        Toast.show({ type: 'error', text1: 'File too large', text2: 'Maximum size is 25 MB' });
        return;
      }
      setUploadPct(0);
      await documentsApi.upload(
        { file, name: res.name, folderId: currentFolder?.id },
        (evt) => evt.total && setUploadPct(evt.loaded / evt.total),
      );
      Toast.show({ type: 'success', text1: 'Uploaded', text2: res.name });
      invalidate();
    } catch (e) {
      if (!DocumentPicker.isCancel(e)) {
        Toast.show({ type: 'error', text1: 'Upload failed', text2: e?.message });
      }
    } finally {
      setUploadPct(null);
    }
  };

  const docActions = (doc) =>
    confirmRef.current?.open({
      title: doc.name,
      message: 'Choose an action from below.',
      confirmLabel: 'Open',
      cancelLabel: 'Close',
      onConfirm: () => openDocument(doc),
    });

  const loading = docs.isPending || tree.isPending;

  return (
    <ScreenScaffold>
      <AppHeader
        title="Documents"
        right={
          <Pressable
            onPress={() =>
              nameRef.current?.open({
                title: 'New folder',
                placeholder: 'Folder name',
                submitLabel: 'Create',
                onSubmit: (name) => createFolder.mutateAsync({ name, parentFolderId: currentFolder?.id || null }),
              })
            }
            accessibilityRole="button"
            accessibilityLabel="New folder"
            hitSlop={8}
          >
            <FolderPlus size={22} color={theme.brand} strokeWidth={2.1} />
          </Pressable>
        }
      />
      <View style={styles.controls}>
        <SearchBar value={searchInput} onChangeText={setSearchInput} onDebounced={setSearch} placeholder="Search all documents…" />
        {!search ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crumbs}>
            <Pressable onPress={() => setPath([])} style={styles.crumb} accessibilityRole="button">
              <Home size={14} color={path.length ? theme.colors.inkFaint : theme.brand} strokeWidth={2.2} />
              <AppText variant="caption" color={path.length ? 'inkFaint' : 'brand'}>
                All files
              </AppText>
            </Pressable>
            {path.map((crumb, i) => (
              <View key={crumb.id} style={styles.crumb}>
                <ChevronRight size={13} color={theme.colors.inkFaint} strokeWidth={2} />
                <Pressable onPress={() => setPath(path.slice(0, i + 1))} accessibilityRole="button">
                  <AppText variant="caption" color={i === path.length - 1 ? 'brand' : 'inkFaint'}>
                    {crumb.name}
                  </AppText>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        {uploadPct != null ? (
          <View style={styles.uploadRow}>
            <ProgressBar value={uploadPct} />
            <AppText variant="micro" color="inkFaint" style={styles.uploadLabel}>
              Uploading… {Math.round(uploadPct * 100)}%
            </AppText>
          </View>
        ) : null}
      </View>

      {loading ? (
        <SkeletonList count={7} cardHeight={72} />
      ) : docs.isError ? (
        <ErrorState error={docs.error} onRetry={docs.refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={docs.isRefetching} onRefresh={() => { docs.refetch(); tree.refetch(); }} tintColor={theme.brand} colors={[theme.brand]} />
          }
        >
          {!search && currentFolders.length ? (
            <View style={styles.folderGrid}>
              {currentFolders.map((folder, i) => (
                <Animated.View key={folder.id} entering={i < 8 ? FadeInDown.duration(240).delay(i * 30) : undefined} style={styles.folderCell}>
                  <PressableCard
                    onPress={() => setPath([...path, { id: folder.id, name: folder.name }])}
                    onLongPress={() =>
                      confirmRef.current?.open({
                        title: `Delete "${folder.name}"?`,
                        message: 'The folder and its contents will be removed.',
                        destructive: true,
                        onConfirm: () => deleteFolder.mutateAsync(folder.id),
                      })
                    }
                    style={styles.folderCard}
                  >
                    <Folder size={26} color={theme.brand} strokeWidth={1.9} />
                    <AppText variant="label" numberOfLines={1} style={styles.folderName}>
                      {folder.name}
                    </AppText>
                  </PressableCard>
                </Animated.View>
              ))}
            </View>
          ) : null}

          {currentDocs.length === 0 && currentFolders.length === 0 ? (
            <EmptyState
              icon={File}
              title={search ? 'No matching files' : 'Nothing here yet'}
              message={search ? 'Try a different search.' : 'Upload a file or create a folder to organize your docs.'}
              actionLabel="Upload file"
              onAction={pickAndUpload}
            />
          ) : (
            currentDocs.map((doc, i) => {
              const Icon = iconForName(doc.name);
              const size = formatSize(doc.size || doc.fileSize);
              return (
                <Animated.View key={doc.id} entering={i < 10 ? FadeInDown.duration(240).delay(Math.min(i, 8) * 30) : undefined}>
                  <Card style={styles.docCard}>
                    <Pressable
                      style={styles.docRow}
                      onPress={() => openDocument(doc)}
                      onLongPress={() =>
                        nameRef.current?.open({
                          title: 'Rename document',
                          initial: doc.name,
                          submitLabel: 'Rename',
                          onSubmit: (name) => renameDoc.mutateAsync({ id: doc.id, name }),
                        })
                      }
                      accessibilityRole="button"
                    >
                      <View style={[styles.docIcon, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.md }]}>
                        <Icon size={19} color={theme.brand} strokeWidth={1.9} />
                      </View>
                      <View style={styles.flex}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {doc.name}
                        </AppText>
                        <AppText variant="micro" color="inkFaint">
                          {[doc.fileType, size, relativeTime(doc.createdAt)].filter(Boolean).join(' · ')}
                        </AppText>
                      </View>
                      <Pressable
                        onPress={() =>
                          confirmRef.current?.open({
                            title: `Delete "${doc.name}"?`,
                            destructive: true,
                            onConfirm: () => deleteDoc.mutateAsync(doc.id),
                          })
                        }
                        hitSlop={8}
                        accessibilityLabel="Delete document"
                      >
                        <Trash2 size={16} color={theme.colors.inkFaint} strokeWidth={2} />
                      </Pressable>
                    </Pressable>
                  </Card>
                </Animated.View>
              );
            })
          )}
          <AppText variant="micro" color="inkFaint" style={styles.hint}>
            Tap to open · long-press to rename
          </AppText>
        </ScrollView>
      )}

      <FAB icon={Upload} label="Upload" onPress={pickAndUpload} />
      <NameSheet ref={nameRef} />
      <ConfirmSheet ref={confirmRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  uploadRow: { marginTop: 2 },
  uploadLabel: { marginTop: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  folderCell: { width: '31%', flexGrow: 1, maxWidth: '32%' },
  folderCard: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  folderName: { textAlign: 'center' },
  docCard: { marginBottom: 8, padding: 12 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  hint: { textAlign: 'center', marginTop: 10 },
  sheetField: { marginBottom: 14 },
});
