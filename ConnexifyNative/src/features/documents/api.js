import { API_BASE_URL } from '@env';
import { get, post, patch, del, postMultipart } from '../../api/client';

// server/src/routes/v1/documents.js — GET / returns ALL rows (no pagination);
// upload field is `file` (25MB memory storage); viewer-meta → { mode, filePath }.
export const documentsApi = {
  list: (params) => get('/documents', params),
  folderTree: () => get('/documents/folder-tree'),
  createFolder: (body) => post('/documents/folders', body), // { name, parentFolderId? }
  deleteFolder: (id) => del(`/documents/folders/${id}`),
  upload: ({ file, name, fileType = 'Other', folderId, links }, onProgress) =>
    postMultipart(
      '/documents',
      {
        fields: {
          name,
          fileType,
          ...(folderId ? { folderId } : {}),
          ...(links ? { links: JSON.stringify(links) } : {}),
        },
        files: { file },
      },
      { onUploadProgress: onProgress },
    ),
  rename: (id, name) => patch(`/documents/${id}`, { name }),
  remove: (id) => del(`/documents/${id}`),
  viewerMeta: (id) => get(`/documents/${id}/viewer-meta`),
};

/** Static /uploads files are served from the API origin (server/src/app.js). */
export function fileUrl(filePath) {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const origin = (API_BASE_URL || '').replace(/\/api\/v1\/?$/, '');
  const path = String(filePath).replace(/^\/+/, '');
  return `${origin}/${path}`;
}
