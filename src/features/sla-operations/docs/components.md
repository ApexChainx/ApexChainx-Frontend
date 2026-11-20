# SLA operations components

Reference for the components in `src/features/sla-operations/components/`. They are presentational: they receive data and callbacks through props and do not call the API. Import them by path, for example:

```tsx
import { KpiOverviewGrid } from "@/features/sla-operations/components/KpiOverviewGrid";
```

All components are exported by name; most also have a default export.

## Conventions

Most panels share the same shape.

- **`isLoading`** (default `false`): renders a loading message with `role="status"` (several panels also set `aria-busy`).
- **`error`** (`string | null`, default `null`): renders the message with `role="alert"` instead of the data.
- **Empty data**: renders a short "no data" message instead of an empty table or chart.
- Panels with a heading are `<section>` elements labelled by their heading (`aria-labelledby`).
- Timestamps are ISO 8601 strings, rendered in a `<time>` element where shown.
- Styling uses Tailwind classes; no component depends on code outside this workspace.

Components that deviate (for example `ActionButtonGroup` and `ToolbarDivider`, which have no data states) say so below.

## Overview

| Component | Path | Purpose |
| --- | --- | --- |
| `ActionButtonGroup` | `components/ActionButtonGroup.tsx` | Grouped toolbar buttons |
| `BulkImportPreviewPanel` | `components/BulkImportPreviewPanel.tsx` | Table of rows from a bulk import dry run |
| `DisputeSummaryCard` | `components/DisputeSummaryCard.tsx` | Summary of one SLA dispute |
| `ErrorStatePanel` | `components/ErrorStatePanel.tsx` | Inline error state with optional retry |
| `ExportToolbar` | `components/ExportToolbar.tsx` | One button per export format |
| `ImportValidationReport` | `components/ImportValidationReport.tsx` | Import validation counts and failing rows |
| `IncidentTimelinePanel` | `components/IncidentTimelinePanel.tsx` | Chronological incident events |
| `KpiOverviewGrid` | `components/KpiOverviewGrid.tsx` | Grid of KPI cards |
| `LoadingSkeletonBlock` | `components/LoadingSkeletonBlock.tsx` | Loading placeholder block |
| `MttrBreakdownPanel` | `components/MttrBreakdownPanel.tsx` | Mean/median MTTR and bucket counts |
| `OperationsFilterBar` | `components/OperationsFilterBar.tsx` | Search, date and select filters |
| `OperationsSearchPanel` | `components/OperationsSearchPanel.tsx` | Search box with quick filters |
| `OutageOperationsTable` | `components/OutageOperationsTable.tsx` | Sortable outage table |
| `OutageSeverityDistribution` | `components/OutageSeverityDistribution.tsx` | Outage counts by severity |
| `PaymentReconciliationSummary` | `components/PaymentReconciliationSummary.tsx` | Matched/unmatched/pending payments |
| `RecentOperationsFeed` | `components/RecentOperationsFeed.tsx` | Latest operations list |
| `RootCauseNotesPanel` | `components/RootCauseNotesPanel.tsx` | Root-cause and resolution notes |
| `SectionHeader` | `components/SectionHeader.tsx` | Heading/description/actions row |
| `SettlementBreakdownPanel` | `components/SettlementBreakdownPanel.tsx` | Reward and penalty totals |
| `SlaComplianceSummary` | `components/SlaComplianceSummary.tsx` | Compliance rate against a threshold |
| `SlaTrendSummaryPanel` | `components/SlaTrendSummaryPanel.tsx` | Compliance by period, highlighting big changes |
| `ThresholdComparisonPanel` | `components/ThresholdComparisonPanel.tsx` | Observed values against thresholds |
| `TimelineItem` | `components/TimelineItem.tsx` | Single timeline event row |
| `ToolbarDivider` | `components/ToolbarDivider.tsx` | Separator between toolbar groups |
| `WebhookDeliveryLogPanel` | `components/WebhookDeliveryLogPanel.tsx` | Webhook delivery attempts |
| `WebhookEndpointHealthPanel` | `components/WebhookEndpointHealthPanel.tsx` | Endpoint health with recent deliveries |
| `OutageFilterForm` | `components/forms/OutageFilterForm.tsx` | Controlled outage filter form |
| `SlaPreviewInputForm` | `components/forms/SlaPreviewInputForm.tsx` | Inputs for an SLA penalty preview |
| `WebhookTestEventForm` | `components/forms/WebhookTestEventForm.tsx` | Compose a webhook test event |
| `BulkImportMappingForm` | `components/forms/BulkImportMappingForm.tsx` | Map file columns to import fields |

## Actions and toolbars

### `ActionButtonGroup`

A `role="group"` of buttons. Renders nothing when `actions` is empty (it has no loading or error state).

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `actions` | `ReadonlyArray<ActionButtonItem>` | required | `{ id, label, onClick, icon?, variant?, disabled? }` |
| `label` | `string` | `"Actions"` | Accessible name of the group |
| `className` | `string` | `""` | |

`variant` is `"primary"`, `"secondary"` (default) or `"danger"`.

```tsx
<ActionButtonGroup
  label="Outage actions"
  actions={[
    { id: "ack", label: "Acknowledge", onClick: acknowledge, variant: "primary" },
    { id: "close", label: "Close", onClick: close, variant: "danger", disabled: !canClose },
  ]}
/>
```

### `ExportToolbar`

A `role="toolbar"` with one button per format. It does not export anything itself: `onExport` receives the chosen format and the parent performs the export.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `onExport` | `(format: ExportFormat) => void` | required | |
| `formats` | `ExportFormat[]` | `["csv", "json"]` | An empty list shows "No export formats available." |
| `disabled` | `boolean` | `false` | Use when there is nothing to export |
| `isExporting` | `boolean` | `false` | Disables the buttons and shows "Exporting..." |
| `error` | `string \| null` | `null` | Shown with `role="alert"` |

`ExportFormat` comes from `types/export.ts`.

### `ToolbarDivider`

A `role="separator"` between toolbar groups.

| Prop | Type | Default |
| --- | --- | --- |
| `orientation` | `"horizontal" \| "vertical"` | `"vertical"` |
| `label` | `string` | none (accessible label for the boundary) |
| `className` | `string` | `""` |

## Filtering and search

### `OperationsFilterBar`

A `role="search"` form of controlled filters: search text, a date range, and severity and status selects. The parent owns the state.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `value` | `OperationsFilterState` | required | From `types/filters.ts` |
| `onChange` | `(next: OperationsFilterState) => void` | required | Called with the whole next state |
| `severityOptions` | `FilterOption[]` | `[]` | `{ value, label }` |
| `statusOptions` | `FilterOption[]` | `[]` | `{ value, label }` |
| `disabled` | `boolean` | `false` | |

```tsx
<OperationsFilterBar
  value={filters}
  onChange={setFilters}
  severityOptions={[{ value: "critical", label: "Critical" }]}
/>
```

### `OperationsSearchPanel`

A search input with optional quick-filter toggles and a result count. Fully controlled.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `query` | `string` | required | |
| `onQueryChange` | `(query: string) => void` | required | |
| `quickFilters` | `QuickFilterOption[]` | `[]` | `{ value, label }` |
| `activeFilters` | `string[]` | `[]` | Values of the active quick filters |
| `onToggleFilter` | `(value: string) => void` | none | |
| `onClear` | `() => void` | none | |
| `onSubmit` | `(query: string) => void` | none | Called with the trimmed query |
| `resultCount` | `number` | none | |
| `isLoading` | `boolean` | `false` | Disables the search button |
| `error` | `string \| null` | `null` | Marks the input invalid |

## Tables, lists and feeds

### `OutageOperationsTable`

A table of outages that the user can sort by clicking a column header. It sorts a copy of `rows` itself (default: newest `startedAt` first).

| Prop | Type | Default |
| --- | --- | --- |
| `rows` | `OutageOperationRow[]` | required |
| `isLoading` | `boolean` | `false` |
| `error` | `string \| null` | `null` |

`OutageOperationRow` is `{ id, service, severity, status, startedAt, durationMinutes }`. Empty `rows` shows "No outage operations found."

### `RecentOperationsFeed`

A list of the latest operations.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `operations` | `RecentOperation[]` | `[]` | `{ id, title, timestamp, status? }` |
| `limit` | `number` | component default | Maximum items shown |
| `isLoading`, `error` | | | See conventions |

### `IncidentTimelinePanel`

An ordered list of incident events, oldest first (the component sorts a copy by `timestamp`).

| Prop | Type | Default |
| --- | --- | --- |
| `events` | `TimelineEvent[]` | required |
| `isLoading`, `error` | | See conventions |

`TimelineEvent` is in `types/timeline.ts`; the panel shows `title`, optional `label`, `description` and `actor.label`.

### `WebhookDeliveryLogPanel`

| Prop | Type | Default |
| --- | --- | --- |
| `attempts` | `WebhookDeliveryAttempt[]` | required |
| `title` | `string` | component default |
| `isLoading`, `error` | | See conventions |

### `WebhookEndpointHealthPanel`

Endpoint health with the recent delivery outcomes per endpoint.

| Prop | Type | Default |
| --- | --- | --- |
| `endpoints` | `WebhookEndpointHealth[]` | required |
| `deliveries` | `WebhookDeliveryAttempt[]` | none |
| `isLoading`, `error` | | See conventions |

Types are in `types/webhook-monitoring.ts`.

## Metrics and summaries

### `KpiOverviewGrid`

A responsive grid of KPI cards. Each card shows the label, `displayValue` with an optional `unit`, an optional delta (arrow plus screen-reader text) and `helperText`. `data-state` carries the card's semantic state for styling.

| Prop | Type | Default |
| --- | --- | --- |
| `cards` | `KpiCardModel[]` | required |
| `title` | `string` | `"KPI overview"` |
| `isLoading`, `error` | | See conventions |

`KpiCardModel` is in `types/kpi.ts`. Empty `cards` shows "No KPIs available."

### `SlaComplianceSummary`

| Prop | Type | Notes |
| --- | --- | --- |
| `compliancePct` | `number` | 0 to 100 |
| `violations` | `number` | |
| `thresholdPct` | `number` | Configured compliance threshold |
| `isLoading`, `error` | | See conventions |

### `SlaTrendSummaryPanel`

Compliance by period, highlighting large changes between consecutive points.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `points` | `SlaTrendPoint[]` | required | `{ period, compliancePct }` (local type, not the one in `types/sla-metrics.ts`) |
| `highlightThreshold` | `number` | `5` | Change, in percentage points, to highlight |
| `isLoading`, `error` | | | See conventions |

### `ThresholdComparisonPanel`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `rows` | `ThresholdComparisonRow[]` | `[]` | `{ metric, threshold, observed, unit?, lowerIsBetter? }` |
| `isLoading`, `error` | | | See conventions |

`lowerIsBetter` defaults to `true` (for example MTTR); set it to `false` for rates such as uptime.

### `MttrBreakdownPanel`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `meanMinutes` | `number` | none | Shown as "N/A" when missing |
| `medianMinutes` | `number` | none | Shown as "N/A" when missing |
| `buckets` | `MttrBucket[]` | `[]` | `{ label, count }`, drawn as `<progress>` bars |
| `isLoading`, `error` | | | See conventions |

### `OutageSeverityDistribution`

| Prop | Type | Notes |
| --- | --- | --- |
| `data` | `OutageSeverityCount[]` | `{ severity, count }`; bars are a share of the total (negative counts count as 0) |
| `isLoading`, `error` | | See conventions |

## Settlement and payments

### `SettlementBreakdownPanel`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `breakdown` | `SettlementBreakdown \| null` | required | `{ reward, penalty }`, both non-negative |
| `currency` | `string` | component default | Currency or asset code for display |
| `isLoading`, `error` | | | See conventions |

### `PaymentReconciliationSummary`

| Prop | Type | Notes |
| --- | --- | --- |
| `totals` | `PaymentReconciliationTotals \| null` | `{ matched, unmatched, pending, totalAmount, currency }` |
| `isLoading`, `error` | | See conventions |

### `DisputeSummaryCard`

A card for one SLA dispute: status, reason, opened time, and optionally the outage and disputed amount.

| Prop | Type | Notes |
| --- | --- | --- |
| `dispute` | `DisputeSummary \| null` | `{ id, status, outageId?, reason, openedAt, amountLabel? }`; `status` is `open`, `under_review`, `resolved` or `rejected` |
| `isLoading`, `error` | | See conventions |

A `null` dispute shows "No dispute for this outage."

### `RootCauseNotesPanel`

Notes grouped by kind.

| Prop | Type | Notes |
| --- | --- | --- |
| `notes` | `RootCauseNote[]` | `{ id, kind: "root_cause" \| "resolution", body, author?, createdAt }` |
| `isLoading`, `error` | | See conventions |

## Bulk import

### `BulkImportPreviewPanel`

A table of the rows from a dry run: row number, status, one column per file header and the findings for each row. A one-line summary (file name, row counts, error count) sits above the table.

| Prop | Type | Default |
| --- | --- | --- |
| `preview` | `BulkImportPreview \| null` | required |
| `isLoading`, `error` | | See conventions |

### `ImportValidationReport`

Counts (total, valid, invalid, warnings) and, for invalid rows, the error findings per row.

| Prop | Type | Default |
| --- | --- | --- |
| `preview` | `BulkImportPreview \| null` | required |
| `isLoading`, `error` | | See conventions |

`BulkImportPreview` is in `types/bulk-import-preview.ts`.

## Forms

The forms validate on submit and show inline messages for invalid fields. Some are controlled by the parent and some keep their own state, as noted below. None of them call an API.

### `OutageFilterForm`

Controlled by the parent: `value: OutageFilterValues` (`{ search, severity, status }`), `onChange(value)` and `onSubmit(value)`. The pure `validateOutageFilter` is exported alongside it.

### `SlaPreviewInputForm`

Three numeric inputs (outage minutes, threshold minutes, penalty percent). `onSubmit` receives parsed numbers only when all are valid; `initialValues` prefills the text. The pure `validateSlaPreviewInput` is exported alongside it.

### `WebhookTestEventForm`

Event type, endpoint URL and a JSON payload. `onSubmit` receives `{ eventType, endpointUrl, payload }` with the payload already parsed; invalid JSON is reported inline. Props: `eventTypes?`, `onSubmit`, `isSubmitting?`.

### `BulkImportMappingForm`

Maps the columns found in an uploaded file to the fields the bulk outage import accepts, and chooses how duplicates are handled and whether to run as a dry run.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `sourceHeaders` | `readonly string[]` | required | Column headers of the file |
| `initialMapping` | `Record<string, string>` | `suggestBulkImportMapping(sourceHeaders)` | Target field name to source column |
| `initialOnDuplicate` | `"skip" \| "update" \| "fail"` | `"skip"` | |
| `initialDryRun` | `boolean` | `true` | |
| `onSubmit` | `(config: BulkImportMappingConfig) => void` | required | `{ mapping, onDuplicate, dryRun }`; only mapped fields are in `mapping` |
| `onCancel` | `() => void` | none | Renders a Cancel button when given |
| `submitLabel` | `string` | `"Continue"` | |

Required target fields are `service_id`, `start_time` and `end_time`; `severity`, `status`, `site_name`, `description` and `assigned_to` are optional (`BULK_IMPORT_TARGET_FIELDS`). Submit is blocked, with a message on each field, when a required field is unmapped, a chosen column is not in the file, or one column is used for two fields. Messages appear after the first submit attempt and update as the operator edits. With no source headers, the form explains that no columns were found and is disabled.

The helpers `suggestBulkImportMapping` (matches headers to fields ignoring case, spaces and dashes) and `validateBulkImportMapping` are exported for reuse and testing.

```tsx
<BulkImportMappingForm
  sourceHeaders={preview.headers}
  onSubmit={({ mapping, onDuplicate, dryRun }) => startImport({ mapping, onDuplicate, dryRun })}
  onCancel={closeDialog}
/>
```
