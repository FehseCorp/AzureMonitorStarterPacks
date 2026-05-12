/**
 * usePaaSJob
 *
 * Fires a PaaS AddPack / RemoveTag request to packmgmt (returns 202 + jobId),
 * then polls config?Action=getJobStatus&JobId=… every 3 s until the job
 * reaches "Completed" status.
 *
 * Exposed state:
 *   phase   – 'idle' | 'submitting' | 'running' | 'completed' | 'error'
 *   progress – { total, completed, failed }
 *   results  – per-resource result rows from Table Storage
 *   error    – Error | null
 *   submit(params) – kick off the job
 *   reset()        – back to idle
 */

import { useState, useRef, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { managementScope } from "../auth/msalConfig";
import { acquireToken } from "../auth/acquireToken";
import { callFunction, type FunctionEndpoint } from "../services/functionClient";
import { useConfig } from "./useConfig";
import { saveJob, updateJob } from "../services/jobStore";

export interface JobResult {
  ResourceId: string;
  Status: "Succeeded" | "Failed";
  Detail: string;
  Action: string;
}

export interface JobStatus {
  JobId: string;
  Status: "Queued" | "Running" | "Completed";
  Total: number;
  Completed: number;
  Failed: number;
  Action: string;
  Results: JobResult[];
}

export type JobPhase = "idle" | "submitting" | "running" | "completed" | "error";

export interface PaaSJobState {
  phase: JobPhase;
  progress: { total: number; completed: number; failed: number };
  results: JobResult[];
  error: Error | null;
  submit: (params: { endpoint: FunctionEndpoint; body: Record<string, unknown>; label?: string }) => void;
  reset: () => void;
}

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_COUNT = 300; // 300 × 3 s = 15 minutes hard cap

export function usePaaSJob(onCompleted?: (status: JobStatus) => void): PaaSJobState {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const { config } = useConfig();

  const [phase, setPhase] = useState<JobPhase>("idle");
  const [progress, setProgress] = useState({ total: 0, completed: 0, failed: 0 });
  const [results, setResults] = useState<JobResult[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const pollCountRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (jobId: string) => {
    pollCountRef.current += 1;
    if (pollCountRef.current > MAX_POLL_COUNT) {
      stopPolling();
      setPhase("error");
      setError(new Error("Job timed out: no progress after 15 minutes. The tasks may have been poison-queued. Please retry."));
      return;
    }
    try {
      if (!account || !config.functionAppUrl) return;
      const tokenResponse = await acquireToken(instance, account, managementScope);
      const raw = await callFunction(
        config.functionAppUrl,
        tokenResponse.accessToken,
        "config",
        undefined,
        { Action: "getJobStatus", JobId: jobId },
      );
      let status: JobStatus;
      if (typeof raw === "string") {
        status = JSON.parse(raw) as JobStatus;
      } else {
        status = raw as JobStatus;
      }
      setProgress({ total: status.Total, completed: status.Completed, failed: status.Failed });
      setResults(status.Results ?? []);

      // Keep localStorage in sync
      updateJob(jobId, {
        status: status.Status === "Completed" ? "Completed" : status.Status === "Failed" ? "Failed" : "Running",
        completed: status.Completed,
        failed: status.Failed,
        results: status.Results?.map((r) => ({ ResourceId: r.ResourceId, Status: r.Status, Detail: r.Detail })),
      });

      if (status.Status === "Completed") {
        stopPolling();
        setPhase("completed");
        onCompleted?.(status);
      } else if (status.Status === "Failed") {
        stopPolling();
        setPhase("error");
        setError(new Error("Job failed. Some or all tasks may have been poison-queued. Please retry."));
      }
    } catch (err) {
      stopPolling();
      setPhase("error");
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [account, config.functionAppUrl, instance, onCompleted, stopPolling]);

  const submit = useCallback(
    async ({ endpoint, body, label }: { endpoint: FunctionEndpoint; body: Record<string, unknown>; label?: string }) => {
      if (!account) { setError(new Error("Not authenticated")); setPhase("error"); return; }
      if (!config.functionAppUrl) { setError(new Error("Function App URL not configured")); setPhase("error"); return; }

      setPhase("submitting");
      setProgress({ total: 0, completed: 0, failed: 0 });
      setResults([]);
      setError(null);
      pollCountRef.current = 0;

      try {
        const tokenResponse = await acquireToken(instance, account, managementScope);
        const raw = await callFunction(
          config.functionAppUrl,
          tokenResponse.accessToken,
          endpoint,
          body,
        );
        // Expect { jobId: string, total: number } with HTTP 202
        let resp: { jobId: string; total: number };
        if (typeof raw === "string") {
          resp = JSON.parse(raw);
        } else {
          resp = raw as { jobId: string; total: number };
        }
        if (!resp?.jobId) throw new Error("Backend did not return a jobId");
        jobIdRef.current = resp.jobId;
        setProgress({ total: resp.total ?? 0, completed: 0, failed: 0 });
        setPhase("running");

        // Persist to localStorage so the Jobs page can track it across navigation
        saveJob({
          jobId: resp.jobId,
          label: label ?? `Job — ${resp.total ?? 0} resource(s)`,
          action: (body.Action as string) ?? "Unknown",
          total: resp.total ?? 0,
          submittedAt: new Date().toISOString(),
          status: "Queued",
          completed: 0,
          failed: 0,
        });

        // Start polling
        pollRef.current = setInterval(() => {
          pollStatus(resp.jobId);
        }, POLL_INTERVAL_MS);
        // Poll once immediately
        pollStatus(resp.jobId);
      } catch (err) {
        setPhase("error");
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [account, config.functionAppUrl, instance, pollStatus],
  );

  const reset = useCallback(() => {
    stopPolling();
    jobIdRef.current = null;
    setPhase("idle");
    setProgress({ total: 0, completed: 0, failed: 0 });
    setResults([]);
    setError(null);
  }, [stopPolling]);

  return { phase, progress, results, error, submit, reset };
}
