# Resource Cache Plan

## Problem

In large environments the portal is slow when switching between Monitored / Non-Monitored tabs because every view triggers a live Azure Resource Graph (ARG) query. Additionally:

- PaaS queries run server-side in the Function App (`Search-AzGraph`) on every HTTP call.
- IaaS and Discovery queries run client-side from the browser (`@azure/arm-resourcegraph`).
- React Query `staleTime` is 60 s; `refetchOnWindowFocus` defaults to `true` — alt-tabbing alone causes refetches.
- After a mutation (AddPack / RemoveTag) the entire query cache is blown away, forcing a full reload.

## Current Data Flow

| Data set | Where query runs | Source | Frontend cache |
|---|---|---|---|
| Monitored PaaS | Function App (`config`) | `Search-AzGraph` server-side | React Query 60 s staleTime |
| Non-Monitored PaaS | Function App (`config`) | `Search-AzGraph` server-side | React Query 60 s staleTime |
| Tagged VMs (IaaS) | Browser | `ResourceGraphClient` | React Query 60 s staleTime |
| Non-Monitored VMs (IaaS) | Browser | `ResourceGraphClient` | React Query 60 s staleTime |
| Discovery Tagged | Browser | `ResourceGraphClient` | React Query 60 s staleTime |
| Discovery Non-Tagged | Browser | `ResourceGraphClient` | React Query 60 s staleTime |

## Proposed Architecture

### Layer 1 — Quick Wins (frontend only)

- Set `refetchOnWindowFocus: false` globally in the `QueryClient`.
- Increase default `staleTime` to 5 minutes (300 000 ms).
- No backend changes required.

### Layer 2 — Backend Cache (Blob Storage)

Create a blob container `amp-cache/` in the solution's Storage Account. Each data set is a JSON blob:

| Blob | Content |
|---|---|
| `monitoredPaaS.json` | Monitored PaaS resources |
| `nonMonitoredPaaS.json` | Non-monitored PaaS resources |
| `taggedVMs.json` | Monitored VMs |
| `nonMonitoredVMs.json` | Non-monitored VMs |
| `discoveryTagged.json` | Discovery-tagged VMs |
| `discoveryNonTagged.json` | Discovery non-tagged VMs |
| `cacheManifest.json` | `{ lastUpdated: { <dataset>: <ISO timestamp>, ... } }` |

A new **timer-triggered Function** (`cacheRefresh`) runs every 5–10 minutes:

1. Executes all ARG queries (same queries currently used).
2. Writes results to the blobs above.
3. Updates `cacheManifest.json` with per-dataset timestamps.

### Layer 3 — Cache-Aware HTTP Endpoints

Modify existing and add new actions in the `config` Function:

| Action | Behaviour |
|---|---|
| `getMonitoredPaaS` | Read `monitoredPaaS.json` from blob (fast) |
| `getNonMonitoredPaaS` | Read `nonMonitoredPaaS.json` from blob |
| `getTaggedVMs` (new) | Read `taggedVMs.json` from blob |
| `getNonMonitoredVMs` (new) | Read `nonMonitoredVMs.json` from blob |
| `getDiscoveryTagged` (new) | Read `discoveryTagged.json` from blob |
| `getDiscoveryNonTagged` (new) | Read `discoveryNonTagged.json` from blob |
| `getCacheStatus` (new) | Return `cacheManifest.json` |

All endpoints accept an optional `?fresh=true` query param to bypass the cache and run a live ARG query (then update the blob).

### Layer 4 — Mutation-Driven Cache Invalidation

In `packmgmt/run.ps1`, after any `AddPack` or `RemoveTag` completes successfully, re-run **only the affected queries** and update the relevant blobs:

| Mutation scope | Blobs refreshed |
|---|---|
| IaaS AddPack / RemoveTag | `taggedVMs.json`, `nonMonitoredVMs.json` |
| PaaS AddPack / RemoveTag | `monitoredPaaS.json`, `nonMonitoredPaaS.json` |
| Discovery AddPack / RemoveTag | `discoveryTagged.json`, `discoveryNonTagged.json` |

This ensures the cache is always fresh immediately after a user action.

### Layer 5 — Frontend Migration

| Change | Reason |
|---|---|
| Replace `useARGQuery` in Servers / Discovery with `useQuery` → Function App | All data from one source; no browser ARG calls |
| Increase `staleTime` to 5 min | Fewer background refetches |
| `refetchOnWindowFocus: false` | No alt-tab refetches |
| Mutation `onSuccess` → `invalidateQueries` (already in place) | Triggers re-read from fresh cache |
| Add cache-age indicator ("Updated 2 min ago") per tab | User knows data freshness |
| Keep manual refresh button → calls with `?fresh=true` | User can force a live query |

### Layer 6 — Startup Warm-Up

On portal load, call `getCacheStatus`. If the cache is older than the configured threshold or missing, trigger a `?fresh=true` call and show a one-time "Loading initial data…" spinner.

## Implementation Phases

| Phase | Scope | Impact |
|---|---|---|
| **1** | `refetchOnWindowFocus: false` + `staleTime` 5 min | Quick win, frontend only |
| **2** | Blob container + `cacheRefresh` timer Function | Backend cache foundation |
| **3** | Modify `config/run.ps1` to read PaaS data from cache blobs | PaaS reads become instant |
| **4** | New IaaS / Discovery endpoints; migrate frontend from `useARGQuery` to Function App | Unified data flow |
| **5** | Post-mutation cache refresh in `packmgmt/run.ps1` | Cache stays fresh after changes |
| **6** | Cache-age UI indicator + startup warm-up | Polish |
