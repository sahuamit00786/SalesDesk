import { baseApi } from '@/features/api/baseApi'

export const DOCUMENT_TYPES = ['Contract', 'NDA', 'Proposal', 'Invoice', 'Presentation', 'Image', 'Other']

export const documentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDocuments: build.query({
      query: (params) => ({ url: '/documents', params }),
      providesTags: [{ type: 'Document', id: 'LIST' }],
    }),
    getLeadDocumentSummaries: build.query({
      query: () => ({ url: '/documents/lead-summaries' }),
      providesTags: [{ type: 'Document', id: 'LEAD_SUMMARIES' }],
    }),
    getDocumentFolderTree: build.query({
      query: () => '/documents/folder-tree',
      providesTags: [{ type: 'Document', id: 'FOLDER_TREE' }],
    }),
    uploadDocument: build.mutation({
      query: ({ file, name, fileType, description, folderId, folderIds, links }) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', name)
        formData.append('fileType', fileType)
        if (description != null && String(description).trim()) formData.append('description', String(description).trim())
        if (folderId) formData.append('folderId', folderId)
        if (folderIds?.length) formData.append('folderIds', JSON.stringify(folderIds))
        if (links?.length) formData.append('links', JSON.stringify(links))
        return { url: '/documents', method: 'POST', body: formData }
      },
      invalidatesTags: [
        { type: 'Document', id: 'LIST' },
        { type: 'Document', id: 'FOLDER_TREE' },
        { type: 'Document', id: 'LEAD_SUMMARIES' },
      ],
    }),
    patchDocument: build.mutation({
      query: ({ id, ...body }) => ({ url: `/documents/${id}`, method: 'PATCH', body }),
      invalidatesTags: [
        { type: 'Document', id: 'LIST' },
        { type: 'Document', id: 'LEAD_SUMMARIES' },
      ],
    }),
    addDocumentLinks: build.mutation({
      query: ({ id, links }) => ({ url: `/documents/${id}/links`, method: 'POST', body: { links } }),
      invalidatesTags: [{ type: 'Document', id: 'LIST' }, { type: 'Document', id: 'LEAD_SUMMARIES' }],
    }),
    createDocumentFolder: build.mutation({
      query: (body) => ({ url: '/documents/folders', method: 'POST', body }),
      invalidatesTags: [{ type: 'Document', id: 'FOLDER_TREE' }],
    }),
    addDocumentToFolder: build.mutation({
      query: ({ id, folderIds }) => ({ url: `/documents/${id}/folders`, method: 'POST', body: { folderIds } }),
      invalidatesTags: [{ type: 'Document', id: 'FOLDER_TREE' }, { type: 'Document', id: 'LIST' }],
    }),
    removeDocumentFromFolder: build.mutation({
      query: ({ id, folderId }) => ({ url: `/documents/${id}/folders/${folderId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Document', id: 'FOLDER_TREE' }, { type: 'Document', id: 'LIST' }],
    }),
    deleteDocument: build.mutation({
      query: (id) => ({ url: `/documents/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Document', id: 'LIST' }, { type: 'Document', id: 'FOLDER_TREE' }, { type: 'Document', id: 'LEAD_SUMMARIES' }],
    }),
    moveDocumentFolder: build.mutation({
      query: ({ id, fromFolderId, toFolderId }) => ({
        url: `/documents/${id}/move-folder`,
        method: 'POST',
        body: { fromFolderId, toFolderId },
      }),
      invalidatesTags: [{ type: 'Document', id: 'LIST' }, { type: 'Document', id: 'FOLDER_TREE' }],
    }),
    getFolderInfo: build.query({
      query: (id) => `/documents/folders/${id}/info`,
    }),
    deleteFolder: build.mutation({
      query: (id) => ({ url: `/documents/folders/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Document', id: 'LIST' }, { type: 'Document', id: 'FOLDER_TREE' }, { type: 'Document', id: 'LEAD_SUMMARIES' }],
    }),
  }),
})

export const {
  useGetDocumentsQuery,
  useLazyGetDocumentsQuery,
  useGetLeadDocumentSummariesQuery,
  useGetDocumentFolderTreeQuery,
  useUploadDocumentMutation,
  usePatchDocumentMutation,
  useAddDocumentLinksMutation,
  useCreateDocumentFolderMutation,
  useAddDocumentToFolderMutation,
  useRemoveDocumentFromFolderMutation,
  useDeleteDocumentMutation,
  useMoveDocumentFolderMutation,
  useLazyGetFolderInfoQuery,
  useDeleteFolderMutation,
} = documentsApi
