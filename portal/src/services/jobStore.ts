/**
 * jobStore — persists PaaS async job metadata to localStorage so the
 * Jobs page can display and poll them across navigation / page reloads.
 */

const STORAGE_KEY = "amp_paas_jobs";
const MAX_JOBS = 30;

export type StoredJobStatus = "Queued" | "Running" | "Completed" | "Failed";

export interface StoredJobResult {
  ResourceId: string;
  Status: string;
  Detail: string;
}

export interface StoredJob {
  jobId: string;
  /** Human-readable label, e.g. "Enable Monitoring — 5 resources" */
  label: string;
  /** AddPack | RemoveTag */
  action: string;
  total: number;
  submittedAt: string; // ISO-8601
  status: StoredJobStatus;
  completed: number;
  failed: number;
  results?: StoredJobResult[];
}

export function loadJobs(): StoredJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredJob[]) : [];
  } catch {
    return [];
  }
}

export function saveJob(job: StoredJob): void {
  const jobs = loadJobs().filter((j) => j.jobId !== job.jobId);
  const updated = [job, ...jobs].slice(0, MAX_JOBS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function updateJob(jobId: string, patch: Partial<StoredJob>): void {
  const jobs = loadJobs();
  const idx = jobs.findIndex((j) => j.jobId === jobId);
  if (idx >= 0) {
    jobs[idx] = { ...jobs[idx], ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }
}

export function clearFinishedJobs(): void {
  const active = loadJobs().filter(
    (j) => j.status === "Queued" || j.status === "Running",
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
}
