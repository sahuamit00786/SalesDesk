import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ListFilter, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { AddLeadModal } from "@/features/leads/components/AddLeadModal";
import { BulkActionsBar } from "@/features/leads/components/BulkActionsBar";
import { DuplicateWarning } from "@/features/leads/components/DuplicateWarning";
import { FilterBuilder } from "@/features/leads/components/FilterBuilder";
import { LeadsTable } from "@/features/leads/components/LeadsTable";
import {
  useBulkLeadsMutation,
  useCreateLeadMutation,
  useDeleteLeadMutation,
  useExportLeadsMutation,
  useGetLeadFormMetaQuery,
  useGetLeadsQuery,
  useImportLeadsMutation,
  useUpdateLeadMutation,
} from "@/features/leads/leadsApi";
import {
  clearSelected,
  setFilters,
  setPagination,
  setSelected,
  setSort,
  setTotal,
  toggleSelected,
} from "@/features/leads/leadsSlice";
import {
  selectLeadFilters,
  selectLeadPagination,
  selectLeadSelected,
  selectLeadSort,
} from "@/features/leads/leadsSelectors";
import { CreateMeetingModal } from "@/features/meetings/components/CreateMeetingModal";
import { CreateOpportunityModal } from "@/features/opportunities/components/CreateOpportunityModal";
import { useCreateOpportunityMutation } from "@/features/opportunities/opportunitiesApi";

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

/** @param {{ variant?: 'leads' | 'opportunities' }} props */
export function LeadsListPage({ variant = "leads" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOpportunities = variant === "opportunities";
  const filters = useSelector(selectLeadFilters);
  const sort = useSelector(selectLeadSort);
  const pagination = useSelector(selectLeadPagination);
  const selected = useSelector(selectLeadSelected);
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserIds, setAssignUserIds] = useState([]);
  const [editLead, setEditLead] = useState(null);
  const [dupeState, setDupeState] = useState({
    open: false,
    attemptedPhone: "",
    duplicates: [],
  });
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [selectedLeadForMeeting, setSelectedLeadForMeeting] = useState(null);
  const [createOppOpen, setCreateOppOpen] = useState(false);

  const query = {
    ...filters,
    sort: sort.field,
    order: sort.order,
    page: pagination.page,
    limit: pagination.limit,
    isOpportunity: isOpportunities ? true : false,
  };
  const { data, isLoading, refetch } = useGetLeadsQuery(query);
  const { data: formMetaData } = useGetLeadFormMetaQuery();
  const [createLead] = useCreateLeadMutation();
  const [updateLead] = useUpdateLeadMutation();
  const [deleteLead] = useDeleteLeadMutation();
  const [bulkLeads] = useBulkLeadsMutation();
  const [importLeads] = useImportLeadsMutation();
  const [exportLeads] = useExportLeadsMutation();
  const [createOpportunity, { isLoading: creatingOpp }] = useCreateOpportunityMutation();

  const rows = data?.data || [];
  const total = data?.meta?.total || 0;
  const pages = Math.max(1, Math.ceil(total / pagination.limit));
  const users = formMetaData?.data?.users || [];
  const opportunityStages = formMetaData?.data?.opportunityStages || [];

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
      await fn(body).unwrap();
      setEditLead(null);
      toast.success(editLead ? "Lead updated" : "Lead saved");
      refetch();
    } catch (err) {
      if (err?.data?.error?.code === "DUPLICATE_LEAD") {
        const attemptedPhone =
          `${payload.phoneCountryCode || ""} ${payload.phone || ""}`.trim();
        setDupeState({
          open: true,
          attemptedPhone,
          duplicates: err?.data?.duplicates || [],
        });
        return;
      }
      throw err;
    }
  }

  async function handleBulk(action, payload = {}) {
    if (!selected.length) return;
    await bulkLeads({ ids: selected, action, payload }).unwrap();
    dispatch(clearSelected());
    refetch();
  }

  async function submitBulkAssign() {
    if (!selected.length) return;
    if (!assignUserIds.length) {
      toast.error("Please select at least one user");
      return;
    }
    await handleBulk("assign", {
      assignedTo: assignUserIds[0],
      assignedUserIds: assignUserIds,
    });
    setAssignOpen(false);
    setAssignUserIds([]);
    toast.success("Leads assigned");
  }

  return (
    <PageShell fullWidth>
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-end gap-2 overflow-x-auto">
          <div className="flex min-w-max items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border bg-white px-4 text-sm"
            >
              <ListFilter className="h-3.5 w-3.5" />
              Filters
            </button>
            <button
              type="button"
              onClick={() =>
                exportAndDownload(isOpportunities ? "opportunities-all" : "leads-all", {
                  filters: {
                    isOpportunity: isOpportunities ? true : false,
                  },
                })
              }
              className="h-9 rounded-lg border border-surface-border bg-white px-4 text-sm"
            >
              Export all
            </button>
            {isOpportunities ? (
              <button
                type="button"
                onClick={() => setCreateOppOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                New opportunity
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditLead(null);
                  setAddOpen(true);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Lead
              </button>
            )}
            {/* <button
              type="button"
              onClick={() => setMeetingOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Meeting
            </button> */}
            <button
              type="button"
              onClick={() => {
                if (!selected.length) {
                  toast.error("Select at least one lead");
                  return;
                }
                setSelectedLeadForMeeting(selected[0]); // 👈 take first selected lead
                setMeetingOpen(true);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Meeting
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-surface-border bg-white p-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="mb-1.5 h-10 animate-pulse rounded-lg bg-surface-subtle"
              />
            ))}
          </div>
        ) : (
          <>
            <LeadsTable
              variant={variant}
              rows={rows}
              selected={selected}
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
              onDelete={async (lead) => {
                await deleteLead(lead.id).unwrap();
                toast.success("Lead deleted");
              }}
            />
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <p>
                Showing {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(total, pagination.page * pagination.limit)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="h-8 rounded-lg border border-surface-border bg-white px-3 disabled:opacity-50"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    dispatch(setPagination({ page: pagination.page - 1 }))
                  }
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="h-8 rounded-lg border border-surface-border bg-white px-3 disabled:opacity-50"
                  disabled={pagination.page >= pages}
                  onClick={() =>
                    dispatch(setPagination({ page: pagination.page + 1 }))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <BulkActionsBar
        count={selected.length}
        onAssign={() => setAssignOpen(true)}
        onStatus={() => handleBulk("status", { status: "qualified" })}
        onTag={() => handleBulk("tag", { tags: ["hot"] })}
        onExport={() => handleBulk("export")}
        onDelete={() => handleBulk("delete")}
        onClear={() => dispatch(clearSelected())}
      />

      <AddLeadModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditLead(null);
        }}
        initialLead={editLead}
        defaultIsOpportunity={false}
        onSubmit={(payload) => submitLead(payload)}
        onBulkImport={async (rowsForImport) =>
          importLeads(rowsForImport).unwrap()
        }
      />

      {/* <CreateMeetingModal
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        users={users}
      /> */}
      <CreateMeetingModal
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        users={users}
        leadId={selectedLeadForMeeting} // ✅ FIX
      />
      {assignOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-4 shadow-2xl">
            <h3 className="text-base font-semibold text-ink">
              Assign selected leads
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Select one or more users to assign {selected.length} lead(s).
            </p>
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-surface-border p-2">
              {users.map((user) => {
                const checked = assignUserIds.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-brand-50"
                  >
                    <span className="min-w-0">
                      <p className="truncate text-sm text-ink">
                        {user.name || "Unnamed user"}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {user.email}
                      </p>
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setAssignUserIds((prev) =>
                          e.target.checked
                            ? [...prev, user.id]
                            : prev.filter((id) => id !== user.id),
                        );
                      }}
                    />
                  </label>
                );
              })}
              {!users.length ? (
                <p className="px-2 py-3 text-xs text-ink-muted">
                  No users available.
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAssignOpen(false);
                  setAssignUserIds([]);
                }}
                className="h-9 rounded-lg border border-surface-border px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitBulkAssign}
                className="h-9 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <CreateOpportunityModal
        open={createOppOpen}
        onClose={() => setCreateOppOpen(false)}
        users={users}
        opportunityStages={opportunityStages}
        saving={creatingOpp}
        onSave={async (payload) => {
          await createOpportunity(payload).unwrap();
          toast.success("Opportunity added");
          setCreateOppOpen(false);
          refetch();
        }}
        onSaveAndAddAnother={async (payload, reset) => {
          await createOpportunity(payload).unwrap();
          toast.success("Opportunity added");
          reset();
          refetch();
        }}
      />

      <DuplicateWarning
        open={dupeState.open}
        duplicates={dupeState.duplicates}
        attemptedPhone={dupeState.attemptedPhone}
        onCancel={() =>
          setDupeState({ open: false, attemptedPhone: "", duplicates: [] })
        }
        onViewLead={(lead) => {
          setDupeState({ open: false, attemptedPhone: "", duplicates: [] });
          setAddOpen(false);
          setEditLead(null);
          if (lead?.id) navigate(`/leads/${lead.id}`);
        }}
      />
      <FilterBuilder
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={(delta) => dispatch(setFilters(delta))}
        onApply={() => setFilterOpen(false)}
        onReset={() =>
          dispatch(
            setFilters({
              search: "",
              status: [],
              source: [],
              assignedTo: [],
              tags: [],
              scoreMin: 0,
              scoreMax: 100,
              valueMin: null,
              valueMax: null,
            }),
          )
        }
      />
    </PageShell>
  );
}
