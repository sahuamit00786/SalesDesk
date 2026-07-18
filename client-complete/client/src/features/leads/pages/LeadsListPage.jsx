import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Download, Layers, Plus, ChevronDown } from '@/components/ui/icons';
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { PageStack } from "@/components/layout/PageStack";
import { PageContentPanel } from "@/components/layout/PageContentPanel";
import { Button } from "@/components/ui/Button";
import { SkeletonTable } from "@/components/shared/SkeletonLoader";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { AddLeadModal } from "@/features/leads/components/AddLeadModal";
import { BulkActionsBar } from "@/features/leads/components/BulkActionsBar";
import { BulkAssignModal } from "@/features/leads/components/BulkAssignModal";
import { BulkEditModal } from "@/features/leads/components/BulkEditModal";
import { BulkExportModal } from "@/features/leads/components/BulkExportModal";
import { BulkEmailModal } from "@/features/leads/components/BulkEmailModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { coerceToLeadArray, leadListLabel } from "@/features/leads/utils/leadAssignee";
import { FilterBuilder } from "@/features/leads/components/FilterBuilder";
import { LeadsTable } from "@/features/leads/components/LeadsTable";
import { DuplicateLeadsTab } from "@/features/leads/components/DuplicateLeadsTab";
import { ArchivedLeadsTab } from "@/features/leads/components/ArchivedLeadsTab";
import {
  useBulkLeadsMutation,
  useResolveLeadsByIdsMutation,
  useCreateLeadMutation,
  useDeleteLeadMutation,
  useExportLeadsMutation,
  useGetLeadFormMetaQuery,
  useGetLeadsQuery,
  useLazyGetLeadsQuery,
  useImportLeadsMutation,
  usePatchLeadStatusMutation,
  useUpdateLeadMutation,
} from "@/features/leads/leadsApi";
import {
  clearSelected,
  resetFilters,
  resetListSession,
  setFilters,
  setPagination,
  setSelected,
  setSort,
  setTotal,
  toggleSelected,
} from "@/features/leads/leadsSlice";
import { selectWorkspaceList } from "@/features/workspace/workspaceSlice";
import {
  selectLeadFilters,
  selectLeadPagination,
  selectLeadSelected,
  selectLeadSort,
} from "@/features/leads/leadsSelectors";
import { STATUS_OPTIONS } from "@/features/leads/constants";
import { CreateOpportunityModal } from "@/features/opportunities/components/CreateOpportunityModal";
import { useCreateOpportunityMutation, usePatchPipelineStatusMutation } from "@/features/opportunities/opportunitiesApi";
import {
  ListSearchToolbar,
  buildLeadsListQueryParams,
  countActiveRules,
  createRootFilter,
} from "@/features/filters";

/** Inject/update/remove a single-value condition for `field` in the root rules. */
function upsertTreeRule(tree, field, operator, value) {
  const current = tree || createRootFilter()
  const otherRules = (current.rules || []).filter(
    (r) => !(r.type === 'condition' && r.field === field)
  )
  if (value) {
    return { ...current, rules: [...otherRules, { type: 'condition', field, operator, value: [value] }] }
  }
  return { ...current, rules: otherRules.length ? otherRules : [{ type: 'condition', field: 'title', operator: 'contains', value: '' }] }
}

function downloadJsonAsCsv(name, rows) {
  if (!rows?.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map((r) =>
      keys
        .map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Convert filter object to URL search params */
function filtersToParams(filters) {
  const params = {}
  if (filters.search) params.search = filters.search
  if (filters.status?.length) params.status = filters.status.join(',')
  if (filters.stage?.length) params.stage = filters.stage.join(',')
  if (filters.assignedTo?.length) params.assignedTo = filters.assignedTo.join(',')
  if (filters.source?.length) params.source = filters.source.join(',')
  if (filters.workspaceId) params.workspaceId = filters.workspaceId
  if (filters.createdFrom) params.createdFrom = filters.createdFrom
  if (filters.createdTo) params.createdTo = filters.createdTo
  return params
}

/** Convert URL search params to filter delta object */
function paramsToFilters(searchParams) {
  const filters = {}
  const search = searchParams.get('search')
  const status = searchParams.get('status')
  const stage = searchParams.get('stage')
  const assignedTo = searchParams.get('assignedTo')
  const source = searchParams.get('source')
  const workspaceId = searchParams.get('workspaceId')
  const createdFrom = searchParams.get('createdFrom')
  const createdTo = searchParams.get('createdTo')
  if (search) filters.search = search
  if (status) filters.status = status.split(',').filter(Boolean)
  if (stage) filters.stage = stage.split(',').filter(Boolean)
  if (assignedTo) filters.assignedTo = assignedTo.split(',').filter(Boolean)
  if (source) filters.source = source.split(',').filter(Boolean)
  if (workspaceId) filters.workspaceId = workspaceId
  if (createdFrom) filters.createdFrom = createdFrom
  if (createdTo) filters.createdTo = createdTo
  return filters
}

/** @param {{ variant?: 'leads' | 'opportunities' }} props */
export function LeadsListPage({ variant = "leads" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpportunities = variant === "opportunities";
  const listPath = isOpportunities ? "/opportunities" : "/leads";
  const filters = useSelector(selectLeadFilters);
  const sort = useSelector(selectLeadSort);
  const pagination = useSelector(selectLeadPagination);
  const selected = useSelector(selectLeadSelected);
  const user = useSelector((s) => s.auth.user);
  const workspaceList = useSelector(selectWorkspaceList);
  const isCompanyAdmin = Boolean(user?.isCompanyAdmin);
  const userRoleKind = user?.companyRole?.userRoleKind;
  const canSwitchWorkspace =
    isCompanyAdmin || userRoleKind === "workspace_admin" || userRoleKind === "manager";
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState('unique');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserIds, setAssignUserIds] = useState([]);
  const [editLead, setEditLead] = useState(null);
  const [createOppOpen, setCreateOppOpen] = useState(false);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkEmailLeads, setBulkEmailLeads] = useState([]);
  const [bulkEmailLoading, setBulkEmailLoading] = useState(false);
  const [assignLeads, setAssignLeads] = useState([]);
  const [exportModalLeads, setExportModalLeads] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);

  const query = buildLeadsListQueryParams({
    filters,
    sort,
    pagination,
    isOpportunity: isOpportunities,
  });
  const { data, isLoading, refetch } = useGetLeadsQuery(query);
  const [fetchLeadsPage] = useLazyGetLeadsQuery();
  const { data: formMetaData } = useGetLeadFormMetaQuery();
  const [createLead] = useCreateLeadMutation();
  const [updateLead] = useUpdateLeadMutation();
  const [deleteLead] = useDeleteLeadMutation();
  const [bulkLeads] = useBulkLeadsMutation();
  const [resolveLeadsByIds] = useResolveLeadsByIdsMutation();
  const [patchLeadStatus] = usePatchLeadStatusMutation();
  const [patchPipelineStatus] = usePatchPipelineStatusMutation();
  const [importLeads] = useImportLeadsMutation();
  const [exportLeads] = useExportLeadsMutation();
  const [createOpportunity, { isLoading: creatingOpp }] = useCreateOpportunityMutation();

  const rows = coerceToLeadArray(data?.data ?? data);
  const total = data?.meta?.total || 0;
  const pages = Math.max(1, Math.ceil(total / pagination.limit));
  const users = formMetaData?.data?.users || [];
  const pipelineStatuses = formMetaData?.data?.pipelineStatuses || [];
  const stageOptions = pipelineStatuses.map((s) => ({
    value: s.id,
    label: s.name || "Status",
  }));
  const advancedRuleCount = countActiveRules(filters.filterTree);
  const filterCount = advancedRuleCount ||
    (filters.status?.length || 0) +
    (filters.assignedTo?.length || 0) +
    (filters.source?.length || 0) +
    (filters.stage?.length || 0) +
    (filters.workspaceId ? 1 : 0) +
    (filters.valueMin != null ? 1 : 0) +
    (filters.valueMax != null ? 1 : 0) +
    (filters.unassignedOnly ? 1 : 0);

  /** Fresh list each time user opens Leads or Opportunities (not when returning from same route). */
  useEffect(() => {
    dispatch(resetListSession({ variant }));
    setFilterOpen(false);
    // Hydrate filters from URL on mount
    const fromUrl = paramsToFilters(searchParams)
    if (Object.keys(fromUrl).length > 0) {
      dispatch(setFilters(fromUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, listPath]);

  useEffect(() => {
    dispatch(setTotal(total));
  }, [dispatch, total]);

  async function exportAndDownload(name, payload) {
    const result = await exportLeads(payload).unwrap();
    downloadJsonAsCsv(name, result?.data || []);
  }

  async function submitLead(payload) {
    const fn = editLead ? updateLead : createLead;
    const body = editLead ? { id: editLead.id, ...payload } : { ...payload };
    try {
      const result = await fn(body).unwrap();
      if (result?.queued) {
        refetch();
        return result;
      }
      setEditLead(null);
      toast.success(editLead ? "Lead updated" : "Lead saved");
      refetch();
      return result;
    } catch (err) {
      throw err;
    }
  }

  async function resolveSelectedLeads() {
    const fromPage = rows.filter((r) => selected.includes(r.id));
    const missingIds = selected.filter((id) => !fromPage.some((r) => r.id === id));
    let resolved = [...fromPage];
    if (missingIds.length) {
      const extra = await resolveLeadsByIds(missingIds).unwrap();
      resolved = [...fromPage, ...coerceToLeadArray(extra)];
    }
    const byId = new Map(resolved.map((l) => [l.id, l]));
    return selected.map((id) => byId.get(id)).filter(Boolean);
  }

  async function selectAllMatching() {
    if (!total) return;
    setSelectingAll(true);
    try {
      const perPage = 100;
      const totalPages = Math.ceil(total / perPage);
      const allIds = [];
      for (let p = 1; p <= totalPages; p++) {
        const result = await fetchLeadsPage({ ...query, page: p, limit: perPage }).unwrap();
        allIds.push(...coerceToLeadArray(result?.data ?? result).map((r) => r.id));
      }
      dispatch(setSelected(allIds));
      toast.success(`Selected all ${allIds.length} ${isOpportunities ? 'opportunities' : 'leads'}`);
    } catch {
      toast.error("Could not select all records");
    } finally {
      setSelectingAll(false);
    }
  }

  async function handleBulk(action, payload = {}) {
    if (!selected.length) return;
    await bulkLeads({ ids: selected, action, payload }).unwrap();
    dispatch(clearSelected());
    refetch();
  }

  async function submitBulkEdit(patch) {
    setBulkEditing(true);
    try {
      const res = await bulkLeads({ ids: selected, action: 'update', payload: patch }).unwrap();
      const updatedCount = res?.data?.updated ?? selected.length;
      toast.success(`Updated ${updatedCount} ${isOpportunities ? (updatedCount === 1 ? 'opportunity' : 'opportunities') : updatedCount === 1 ? 'lead' : 'leads'}`);
      const skipped = res?.meta?.skippedHasDeals;
      if (skipped) {
        toast.error(`${skipped} skipped — linked deals must be removed before reverting to lead.`);
      }
      setBulkEditOpen(false);
      dispatch(clearSelected());
      refetch();
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Bulk update failed');
    } finally {
      setBulkEditing(false);
    }
  }

  async function openBulkAssign() {
    if (!selected.length) {
      toast.error("Select at least one lead");
      return;
    }
    try {
      setAssignLeads(await resolveSelectedLeads());
      setAssignUserIds([]);
      setAssignOpen(true);
    } catch {
      toast.error("Could not load selected leads");
    }
  }

  async function openBulkExport() {
    if (!selected.length) {
      toast.error("Select at least one lead");
      return;
    }
    try {
      setExportModalLeads(await resolveSelectedLeads());
      setExportOpen(true);
    } catch {
      toast.error("Could not load selected leads");
    }
  }

  async function submitBulkExport() {
    if (!selected.length) return;
    setExporting(true);
    try {
      const result = await bulkLeads({ ids: selected, action: "export" }).unwrap();
      const exportRows = result?.data?.rows || [];
      if (!exportRows.length) {
        toast.error("Nothing to export");
        return;
      }
      downloadJsonAsCsv(
        isOpportunities ? "opportunities-selected" : "leads-selected",
        exportRows,
      );
      toast.success(`Exported ${exportRows.length} record(s)`);
      setExportOpen(false);
      setExportModalLeads([]);
      dispatch(clearSelected());
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleStatusChange(lead, status) {
    try {
      await patchLeadStatus({ id: lead.id, status }).unwrap();
      toast.success("Status updated");
    } catch (err) {
      toast.error(err?.data?.error?.message || "Could not update status");
    }
  }

  async function handleStageChange(lead, pipelineStatusId) {
    if (!pipelineStatusId) return;
    try {
      await patchPipelineStatus({ id: lead.id, pipelineStatusId }).unwrap();
      toast.success("Status updated");
    } catch (err) {
      toast.error(err?.data?.error?.message || "Could not update status");
    }
  }

  async function confirmBulkDelete() {
    if (!selected.length) return;
    setDeleting(true);
    try {
      await handleBulk("delete");
      setDeleteConfirm(null);
      toast.success(isOpportunities ? "Opportunities deleted" : "Leads deleted");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmSingleDelete(lead) {
    if (!lead?.id) return;
    setDeleting(true);
    try {
      await deleteLead(lead.id).unwrap();
      toast.success(isOpportunities ? "Opportunity deleted" : "Lead deleted");
      setDeleteConfirm(null);
      refetch();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function openBulkEmail() {
    if (!selected.length) {
      toast.error("Select at least one lead");
      return;
    }
    setBulkEmailLoading(true);
    try {
      setBulkEmailLeads(await resolveSelectedLeads());
      setBulkEmailOpen(true);
    } catch {
      toast.error("Could not load selected leads");
    } finally {
      setBulkEmailLoading(false);
    }
  }

  async function submitBulkAssign() {
    if (!selected.length) return;
    if (!assignUserIds.length) {
      toast.error("Please select at least one user");
      return;
    }
    setAssigning(true);
    try {
      await handleBulk("assign", {
        assignedTo: assignUserIds[0],
        assignedUserIds: assignUserIds,
      });
      setAssignOpen(false);
      setAssignUserIds([]);
      setAssignLeads([]);
      toast.success(isOpportunities ? "Opportunities assigned" : "Leads assigned");
    } catch {
      toast.error("Assign failed");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <PageShell fullWidth>
      <PageStack>
        <ListSearchToolbar
          search={filters.search || ""}
          onSearchChange={(search) => dispatch(setFilters({ search }))}
          searchPlaceholder={
            isOpportunities
              ? "Search opportunities by name, company, email…"
              : "Search leads by name, company, email…"
          }
          filterOpen={filterOpen}
          onFilterOpenChange={setFilterOpen}
          filterCount={filterCount}
          filterPanel={
            <FilterBuilder
              filters={filters}
              workspaceOptions={canSwitchWorkspace ? workspaceList : null}
              users={users}
              stageOptions={stageOptions}
              isOpportunities={isOpportunities}
              onChange={(delta) => {
                dispatch(setFilters(delta))
                setSearchParams(filtersToParams({ ...filters, ...delta }))
              }}
              onReset={() => {
                dispatch(resetFilters())
                setSearchParams({})
              }}
              onDraftApply={(tree) => dispatch(setFilters({ filterTree: tree }))}
              onApply={() => setFilterOpen(false)}
            />
          }
          onClearAll={() => dispatch(resetFilters())}
          children={
            <>
              {/* View mode toggle */}
              <div className="flex shrink-0 items-center rounded-xl border border-surface-border bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('unique')}
                  className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${viewMode === 'unique' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                >
                  Unique Leads
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('duplicates')}
                  className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${viewMode === 'duplicates' ? 'bg-amber-500 text-white shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                >
                  Duplicate Leads
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('archived')}
                  className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${viewMode === 'archived' ? 'bg-ink text-white shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                >
                  Archived Leads
                </button>
              </div>

              {selected.length > 0 && viewMode === 'unique' ? (
                <button
                  type="button"
                  disabled={bulkEmailLoading}
                  onClick={openBulkEmail}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 text-sm font-semibold text-brand-900 hover:bg-brand-100 disabled:opacity-60"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Bulk actions
                  <span className="rounded-full bg-[var(--brand-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {selected.length}
                  </span>
                </button>
              ) : null}
            </>
          }
          chips={[]}
          onRemoveChip={(id) => {
            if (id.startsWith("status-")) {
              const s = id.replace("status-", "");
              dispatch(
                setFilters({
                  status: (filters.status || []).filter((x) => x !== s),
                }),
              );
            }
            if (id === "advanced") dispatch(setFilters({ filterTree: null }));
          }}
          actions={
            <>
              {/* Status quick filter */}
              <div className="relative shrink-0">
                {isOpportunities ? (
                  <select
                    value={filters.stage?.length === 1 ? filters.stage[0] : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const delta = {
                        stage: val ? [val] : [],
                        filterTree: upsertTreeRule(filters.filterTree, 'pipelineStatus', 'is_any_of', val),
                      }
                      dispatch(setFilters(delta));
                      setSearchParams(filtersToParams({ ...filters, ...delta }))
                      dispatch(setPagination({ page: 1 }));
                    }}
                    className="h-9 appearance-none rounded-xl border border-surface-border bg-white pl-3 pr-8 text-xs font-medium text-ink outline-none focus:border-brand-400"
                  >
                    <option value="">All statuses</option>
                    {pipelineStatuses.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={filters.status?.length === 1 ? filters.status[0] : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const delta = {
                        status: val ? [val] : [],
                        filterTree: upsertTreeRule(filters.filterTree, 'status', 'is_any_of', val),
                      }
                      dispatch(setFilters(delta));
                      setSearchParams(filtersToParams({ ...filters, ...delta }))
                      dispatch(setPagination({ page: 1 }));
                    }}
                    className="h-9 appearance-none rounded-xl border border-surface-border bg-white pl-3 pr-8 text-xs font-medium text-ink outline-none focus:border-brand-400"
                  >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                )}
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
              </div>

              {/* Assignee quick filter */}
              <div className="relative shrink-0">
                <select
                  value={filters.assignedTo?.length === 1 ? filters.assignedTo[0] : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const delta = {
                      assignedTo: val ? [val] : [],
                      filterTree: upsertTreeRule(filters.filterTree, 'assignedTo', 'is', val),
                    }
                    dispatch(setFilters(delta));
                    setSearchParams(filtersToParams({ ...filters, ...delta }))
                    dispatch(setPagination({ page: 1 }));
                  }}
                  className="h-9 w-36 appearance-none rounded-xl border border-surface-border bg-white pl-3 pr-8 text-xs font-medium text-ink outline-none focus:border-brand-400"
                >
                  <option value="">All assignees</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
              </div>

              <Button
                type="button"
                variant="secondary"
                title={isOpportunities ? "Export filtered opportunities" : "Export filtered leads"}
                onClick={() =>
                  exportAndDownload(isOpportunities ? "opportunities" : "leads", {
                    filters: {
                      isOpportunity: isOpportunities,
                      ...(filters.workspaceId ? { workspaceId: filters.workspaceId } : {}),
                      ...(filters.status?.length ? { status: filters.status } : {}),
                      ...(filters.assignedTo?.length ? { assignedTo: filters.assignedTo } : {}),
                      ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
                    },
                  })
                }
                className="shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>

              {isOpportunities ? (
                <Button type="button" onClick={() => setCreateOppOpen(true)} className="shrink-0 whitespace-nowrap">
                  <Plus className="h-3.5 w-3.5" />
                  New opportunity
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    setEditLead(null);
                    setAddOpen(true);
                  }}
                  className="shrink-0 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Lead
                </Button>
              )}
            </>
          }
        />

        <PageContentPanel flush>
        {viewMode === 'duplicates' ? (
          <div className="p-4">
            <DuplicateLeadsTab />
          </div>
        ) : viewMode === 'archived' ? (
          <div className="p-4">
            <ArchivedLeadsTab isOpportunity={isOpportunities} />
          </div>
        ) : isLoading ? (
          <div className="p-3">
            <SkeletonTable cols={6} rows={8} />
          </div>
        ) : (
          <>
            <LeadsTable
              variant={variant}
              rows={rows}
              selected={selected}
              pipelineStatuses={pipelineStatuses}
              onStatusChange={handleStatusChange}
              onStageChange={handleStageChange}
              onToggleRow={(id) => dispatch(toggleSelected(id))}
              onToggleAll={(checked) =>
                dispatch(setSelected(checked ? rows.map((x) => x.id) : []))
              }
              sort={sort}
              onSort={(field) =>
                dispatch(
                  setSort({
                    field,
                    order:
                      sort.field === field
                        ? sort.order === "asc"
                          ? "desc"
                          : "asc"
                        : "desc",
                  }),
                )
              }
              onEdit={(lead) => {
                setEditLead(lead);
                setAddOpen(true);
              }}
              onDelete={(lead) =>
                setDeleteConfirm({ type: "single", lead })
              }
            />
            <div className="cx-data-grid-footer px-3 py-1.5">
              <TablePaginationBar
                compact
                variant="brand"
                page={pagination.page}
                totalPages={pages}
                onPageChange={(p) => dispatch(setPagination({ page: p }))}
                subLabel={
                  <>
                    Showing {(pagination.page - 1) * pagination.limit + 1}-
                    {Math.min(total, pagination.page * pagination.limit)} of {total}
                  </>
                }
              />
            </div>
          </>
        )}
        </PageContentPanel>
      </PageStack>

      <BulkEmailModal
        open={bulkEmailOpen}
        onClose={() => {
          setBulkEmailOpen(false);
          setBulkEmailLeads([]);
        }}
        leads={bulkEmailLeads}
        onSent={() => {
          dispatch(clearSelected());
          refetch();
        }}
      />

      <BulkActionsBar
        count={selected.length}
        onBulkEmail={openBulkEmail}
        onEdit={() => setBulkEditOpen(true)}
        onAssign={openBulkAssign}
        onExport={openBulkExport}
        onDelete={() => setDeleteConfirm({ type: "bulk", count: selected.length })}
        onClear={() => dispatch(clearSelected())}
        pageCount={rows.length}
        total={total}
        onSelectAll={selectAllMatching}
        selectingAll={selectingAll}
        entityLabel={isOpportunities ? "opportunities" : "leads"}
      />

      <BulkAssignModal
        open={assignOpen}
        onClose={() => {
          setAssignOpen(false);
          setAssignUserIds([]);
          setAssignLeads([]);
        }}
        leads={assignLeads}
        users={users}
        assignUserIds={assignUserIds}
        onAssignUserIdsChange={setAssignUserIds}
        onSubmit={submitBulkAssign}
        submitting={assigning}
      />

      <BulkEditModal
        open={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        count={selected.length}
        sources={formMetaData?.data?.sources || []}
        pipelineStatuses={pipelineStatuses}
        customFields={formMetaData?.data?.customFields || []}
        isOpportunities={isOpportunities}
        onSubmit={submitBulkEdit}
        submitting={bulkEditing}
      />

      <BulkExportModal
        open={exportOpen}
        onClose={() => {
          setExportOpen(false);
          setExportModalLeads([]);
        }}
        leads={exportModalLeads}
        onExport={submitBulkExport}
        exporting={exporting}
        entityLabel={isOpportunities ? "opportunities" : "leads"}
      />

      <ConfirmDialog
        open={deleteConfirm?.type === "bulk"}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmBulkDelete}
        title={isOpportunities ? "Delete opportunities?" : "Delete leads?"}
        description="This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      >
        <p>
          You are about to permanently delete{" "}
          <span className="font-semibold text-ink">{deleteConfirm?.count ?? 0}</span> selected{" "}
          {isOpportunities ? "opportunities" : "leads"}.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteConfirm?.type === "single"}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => confirmSingleDelete(deleteConfirm?.lead)}
        title={isOpportunities ? "Delete opportunity?" : "Delete lead?"}
        description="This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      >
        <p>
          Delete{" "}
          <span className="font-semibold text-ink">
            {leadListLabel(deleteConfirm?.lead)}
          </span>
          ?
        </p>
      </ConfirmDialog>

      <AddLeadModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditLead(null);
        }}
        initialLead={editLead}
        defaultIsOpportunity={isOpportunities}
        onSubmit={(payload) => submitLead(payload)}
        onBulkImport={async (rowsForImport) =>
          importLeads(rowsForImport).unwrap()
        }
      />

      <CreateOpportunityModal
        open={createOppOpen}
        onClose={() => setCreateOppOpen(false)}
        users={users}
        pipelineStatuses={pipelineStatuses}
        saving={creatingOpp}
        onSave={async (payload) => {
          const result = await createOpportunity(payload).unwrap();
          if (result?.queued) {
            toast('Duplicate detected — saved to review queue in Add Lead → Duplicate Leads tab', { icon: '⚠️' });
          } else {
            toast.success("Opportunity added");
          }
          setCreateOppOpen(false);
          refetch();
        }}
        onSaveAndAddAnother={async (payload, reset) => {
          const result = await createOpportunity(payload).unwrap();
          if (result?.queued) {
            toast('Duplicate detected — saved to review queue', { icon: '⚠️' });
          } else {
            toast.success("Opportunity added");
          }
          reset();
          refetch();
        }}
      />

    </PageShell>
  );
}
