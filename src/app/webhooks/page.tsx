"use client";
/** ApexChain Network Operations Intelligence Platform */
/** ApexChain Network Operations Intelligence Platform */

import { useMemo, useState } from "react";
import { validateUrl } from "@/lib/validate-url";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  fetchWebhookDeliveries,
  retryDelivery,
} from "@/services/webhookService";
import WebhookSettings from "@/components/settings/webhook-settings";
import { slaEventKeys } from "@/lib/query-keys";
import type { Webhook, WebhookDelivery } from "@/types/webhook";

const AVAILABLE_EVENTS = ["outage.created", "outage.resolved", "payment.processed", "sla.breached"];

/** Issue #601 — long delivery histories are paged rather than rendered whole. */
const DELIVERY_PAGE_SIZE = 10;

const DELIVERY_STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
        DELIVERY_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [deliveryPage, setDeliveryPage] = useState(1);
  // Issue #603 — which endpoint's signing-secret panel is open, so the
  // operator can generate and register the key the backend verifies with.
  const [secretForId, setSecretForId] = useState<string | null>(null);

  // Issue #623 — webhook reads and invalidations go through the canonical
  // factory keys so they participate in shared sla-events invalidation.
  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: slaEventKeys.webhooks.list(),
    queryFn: fetchWebhooks,
  });

  const { data: deliveries = [], isLoading: deliveriesLoading } = useQuery({
    queryKey: slaEventKeys.webhooks.deliveries(selectedWebhook?.id ?? ""),
    queryFn: () => fetchWebhookDeliveries(selectedWebhook!.id),
    enabled: !!selectedWebhook,
  });

  // Issue #601 — triage filter plus paging so several hundred deliveries stay
  // scannable instead of rendering as one unbounded list.
  const filteredDeliveries = useMemo<WebhookDelivery[]>(
    () =>
      deliveryFilter === "all"
        ? deliveries
        : deliveries.filter((delivery) => delivery.status === deliveryFilter),
    [deliveries, deliveryFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredDeliveries.length / DELIVERY_PAGE_SIZE));

  const pagedDeliveries = useMemo<WebhookDelivery[]>(() => {
    const start = (deliveryPage - 1) * DELIVERY_PAGE_SIZE;
    return filteredDeliveries.slice(start, start + DELIVERY_PAGE_SIZE);
  }, [filteredDeliveries, deliveryPage]);

  const createMutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: slaEventKeys.webhooks.all });
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateWebhook>[1] }) =>
      updateWebhook(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: slaEventKeys.webhooks.all });
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: slaEventKeys.webhooks.all });
      if (selectedWebhook) setSelectedWebhook(null);
    },
    onSettled: () => setPendingDelete(null),
  });

  const retryMutation = useMutation({
    mutationFn: async ({ webhookId, deliveryId }: { webhookId: string; deliveryId: string }) => {
      setRetryingId(deliveryId);
      setRetryError(null);
      return retryDelivery(webhookId, deliveryId);
    },
    onSuccess: () => {
      setRetryingId(null);
      qc.invalidateQueries({ queryKey: slaEventKeys.webhooks.deliveries(selectedWebhook?.id ?? "") });
    },
    onError: (err: Error) => {
      setRetryingId(null);
      setRetryError(err.message || "Failed to retry delivery.");
    },
  });

  function resetForm() {
    setShowForm(false);
    setFormUrl("");
    setFormEvents([]);
    setFormError(null);
    setEditingId(null);
  }

  function openCreate() {
    setEditingId(null);
    setFormUrl("");
    setFormEvents([]);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(wh: Webhook) {
    setEditingId(wh.id);
    setFormUrl(wh.url);
    setFormEvents(wh.events);
    setFormError(null);
    setShowForm(true);
  }

  function toggleEvent(event: string) {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formUrl) { setFormError("URL is required."); return; }
    const urlValidation = validateUrl(formUrl);
    if (!urlValidation.valid) { setFormError(urlValidation.reason ?? "Invalid URL"); return; }
    if (formEvents.length === 0) { setFormError("Select at least one event."); return; }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: { url: formUrl, events: formEvents } });
    } else {
      createMutation.mutate({ url: formUrl, events: formEvents });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Webhooks</h1>
          <p className="text-sm text-gray-500">Manage webhook endpoints and delivery history.</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New webhook
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-gray-700">
            {editingId ? "Edit webhook" : "New webhook"}
          </h2>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Payload URL</label>
            <input
              type="url"
              required
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Events</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map((ev) => (
                <label key={ev} className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={formEvents.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="rounded"
                  />
                  {ev}
                </label>
              ))}
            </div>
          </div>

          {formError && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading webhooks…</p>
      ) : webhooks.length === 0 ? (
        <p className="text-sm text-gray-400">No webhooks configured yet.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className="rounded-xl border bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{wh.url}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {wh.events.join(", ")} &middot;{" "}
                    <span className={wh.active ? "text-green-600" : "text-gray-400"}>
                      {wh.active ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => {
                      setSelectedWebhook(selectedWebhook?.id === wh.id ? null : wh);
                      setDeliveryFilter("all");
                      setDeliveryPage(1);
                    }}
                    className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {selectedWebhook?.id === wh.id ? "Hide deliveries" : "Deliveries"}
                  </button>
                  <button
                    onClick={() =>
                      setSecretForId((current) => (current === wh.id ? null : wh.id))
                    }
                    aria-expanded={secretForId === wh.id}
                    className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {secretForId === wh.id ? "Hide secret" : "Signing secret"}
                  </button>
                  <button
                    onClick={() => openEdit(wh)}
                    className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setPendingDelete(wh)}
                    disabled={deleteMutation.isPending}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {secretForId === wh.id && (
                <div className="mt-4 border-t pt-4">
                  <WebhookSettings
                    key={wh.id}
                    initialConfig={{ url: wh.url, secret: "", events: wh.events }}
                    onSave={(config) =>
                      updateMutation.mutate({
                        id: wh.id,
                        payload: {
                          url: config.url,
                          events: config.events,
                          secret: config.secret,
                        },
                      })
                    }
                  />
                </div>
              )}

              {selectedWebhook?.id === wh.id && (
                <div className="mt-4 border-t pt-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Delivery history
                    </h3>
                    <label className="flex items-center gap-2 text-xs text-gray-500">
                      Last status
                      <select
                        value={deliveryFilter}
                        onChange={(e) => {
                          setDeliveryFilter(e.target.value);
                          setDeliveryPage(1);
                        }}
                        aria-label="Filter deliveries by last status"
                        className="rounded border border-gray-200 px-2 py-0.5 text-xs"
                      >
                        <option value="all">All</option>
                        <option value="success">Succeeded</option>
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                      </select>
                    </label>
                  </div>

                  {retryError && (
                    <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                      {retryError}
                    </p>
                  )}

                  {deliveriesLoading ? (
                    <p className="text-xs text-gray-400">Loading…</p>
                  ) : filteredDeliveries.length === 0 ? (
                    <p className="text-xs text-gray-400" data-testid="deliveries-empty">
                      {deliveries.length > 0 && deliveryFilter !== "all"
                        ? `No ${deliveryFilter} deliveries.`
                        : "No deliveries yet."}
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {pagedDeliveries.map((d) => (
                          <div
                            key={d.id}
                            data-testid="delivery-row"
                            data-status={d.status}
                            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <StatusBadge status={d.status} />
                              <span className="text-gray-500">{d.event}</span>
                              {d.response_code && (
                                <span className="text-gray-400">HTTP {d.response_code}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">
                                {new Date(d.created_at).toLocaleString()}
                              </span>
                              {d.status === "failed" && (
                                <button
                                  onClick={() =>
                                    retryMutation.mutate({ webhookId: wh.id, deliveryId: d.id })
                                  }
                                  disabled={retryMutation.isPending || retryingId === d.id}
                                  className="rounded border border-blue-200 px-2 py-0.5 text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                                >
                                  {retryingId === d.id ? "Retrying…" : "Retry"}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {totalPages > 1 ? (
                        <nav
                          aria-label="Delivery history pagination"
                          className="mt-3 flex items-center justify-between text-xs text-gray-500"
                        >
                          <button
                            type="button"
                            onClick={() => setDeliveryPage((page) => Math.max(1, page - 1))}
                            disabled={deliveryPage <= 1}
                            className="rounded border px-2 py-0.5 disabled:opacity-40"
                          >
                            Previous
                          </button>
                          <span data-testid="deliveries-page">
                            Page {deliveryPage} of {totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDeliveryPage((page) => Math.min(totalPages, page + 1))}
                            disabled={deliveryPage >= totalPages}
                            className="rounded border px-2 py-0.5 disabled:opacity-40"
                          >
                            Next
                          </button>
                        </nav>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete webhook?"
        message={
          `Deleting ${pendingDelete?.url ?? "this webhook"} stops delivery for every subscribed ` +
          "event immediately and cannot be undone."
        }
        confirmPhrase={DELETE_CONFIRM_PHRASE}
        confirmLabel="Delete webhook"
        loading={deleteMutation.isPending}
        variant="danger"
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
