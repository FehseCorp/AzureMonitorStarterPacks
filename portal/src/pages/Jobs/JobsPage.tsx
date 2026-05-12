import { useState, useEffect, useCallback, useRef } from "react";
import {
  Title3,
  Text,
  Button,
  Badge,
  ProgressBar,
  makeStyles,
  tokens,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableCellLayout,
  Spinner,
} from "@fluentui/react-components";
import {
  ChevronDownRegular,
  ChevronRightRegular,
  ArrowSyncRegular,
  DeleteRegular,
} from "@fluentui/react-icons";
import { useMsal } from "@azure/msal-react";
import { managementScope } from "../../auth/msalConfig";
import { acquireToken } from "../../auth/acquireToken";
import { callFunction } from "../../services/functionClient";
import { useConfig } from "../../hooks/useConfig";
import {
  loadJobs,
  updateJob,
  clearFinishedJobs,
  type StoredJob,
} from "../../services/jobStore";
import type { JobStatus } from "../../hooks/usePaaSJob";

const useStyles = makeStyles({
  page: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  emptyText: {
    color: tokens.colorNeutralForeground3,
    paddingTop: tokens.spacingVerticalM,
  },
  resultsTable: {
    marginTop: tokens.spacingVerticalS,
    marginLeft: tokens.spacingHorizontalXL,
  },
  detailText: {
    color: tokens.colorNeutralForeground3,
    fontFamily: "monospace",
    fontSize: tokens.fontSizeBase200,
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
});

const POLL_INTERVAL_MS = 5_000;

function statusBadge(status: StoredJob["status"]) {
  switch (status) {
    case "Queued":
      return <Badge appearance="tint" color="informative">Queued</Badge>;
    case "Running":
      return <Badge appearance="tint" color="warning">Running</Badge>;
    case "Completed":
      return <Badge appearance="tint" color="success">Completed</Badge>;
    case "Failed":
      return <Badge appearance="tint" color="danger">Failed</Badge>;
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function actionLabel(action: string) {
  if (action === "AddPack") return "Enable Monitoring";
  if (action === "RemoveTag") return "Remove Monitoring";
  return action;
}

export function JobsPage() {
  const styles = useStyles();
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const { config } = useConfig();

  const [jobs, setJobs] = useState<StoredJob[]>(() => loadJobs());
  const [polling, setPolling] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshJobs = useCallback(() => {
    setJobs(loadJobs());
  }, []);

  const pollActive = useCallback(async () => {
    const current = loadJobs();
    const active = current.filter(
      (j) => j.status === "Queued" || j.status === "Running",
    );
    if (active.length === 0) return;
    if (!account || !config.functionAppUrl) return;

    setPolling(true);
    try {
      const tokenResponse = await acquireToken(instance, account, managementScope);
      await Promise.all(
        active.map(async (job) => {
          try {
            const raw = await callFunction(
              config.functionAppUrl,
              tokenResponse.accessToken,
              "config",
              undefined,
              { Action: "getJobStatus", JobId: job.jobId },
            );
            let status: JobStatus;
            if (typeof raw === "string") {
              status = JSON.parse(raw) as JobStatus;
            } else {
              status = raw as JobStatus;
            }
            updateJob(job.jobId, {
              status:
                status.Status === "Completed"
                  ? "Completed"
                  : status.Status === "Failed"
                  ? "Failed"
                  : "Running",
              completed: status.Completed,
              failed: status.Failed,
              results: status.Results?.map((r) => ({
                ResourceId: r.ResourceId,
                Status: r.Status,
                Detail: r.Detail,
              })),
            });
          } catch {
            // silently ignore per-job poll errors
          }
        }),
      );
    } finally {
      setPolling(false);
      setJobs(loadJobs());
    }
  }, [account, config.functionAppUrl, instance]);

  // Start interval polling when there are active jobs
  useEffect(() => {
    const hasActive = jobs.some(
      (j) => j.status === "Queued" || j.status === "Running",
    );
    if (hasActive && !timerRef.current) {
      timerRef.current = setInterval(pollActive, POLL_INTERVAL_MS);
    } else if (!hasActive && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [jobs, pollActive]);

  // Initial poll on mount
  useEffect(() => {
    pollActive();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRow = (jobId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
      return next;
    });
  };

  const handleClearFinished = () => {
    clearFinishedJobs();
    setJobs(loadJobs());
  };

  const handleRefresh = () => {
    pollActive();
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Title3>Background Jobs</Title3>
        <Button
          appearance="subtle"
          icon={<ArrowSyncRegular style={polling ? { animation: "spin 1s linear infinite" } : undefined} />}
          onClick={handleRefresh}
          disabled={polling}
          title="Refresh"
        />
        <Button
          appearance="subtle"
          icon={<DeleteRegular />}
          onClick={handleClearFinished}
          disabled={jobs.every((j) => j.status === "Queued" || j.status === "Running")}
        >
          Clear finished
        </Button>
      </div>

      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        PaaS monitoring operations run in the background. This page shows their progress and results.
      </Text>

      {jobs.length === 0 && (
        <Text className={styles.emptyText}>No jobs yet. Enable or remove monitoring from the Services pages.</Text>
      )}

      {jobs.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell style={{ width: 32 }} />
              <TableHeaderCell>Submitted</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Label</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Progress</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const isExpanded = expandedRows.has(job.jobId);
              const doneCount = job.completed + job.failed;
              const progressVal = job.total > 0 ? doneCount / job.total : 0;
              const isActive = job.status === "Queued" || job.status === "Running";

              return (
                <>
                  <TableRow key={job.jobId}>
                    <TableCell>
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={isExpanded ? <ChevronDownRegular /> : <ChevronRightRegular />}
                        onClick={() => toggleRow(job.jobId)}
                        disabled={!job.results?.length}
                      />
                    </TableCell>
                    <TableCell>
                      <TableCellLayout>
                        <Text size={200}>{formatTime(job.submittedAt)}</Text>
                      </TableCellLayout>
                    </TableCell>
                    <TableCell>
                      <TableCellLayout>
                        <Text>{actionLabel(job.action)}</Text>
                      </TableCellLayout>
                    </TableCell>
                    <TableCell>
                      <TableCellLayout>
                        <Text size={200}>{job.label}</Text>
                      </TableCellLayout>
                    </TableCell>
                    <TableCell>
                      <TableCellLayout>
                        {statusBadge(job.status)}
                      </TableCellLayout>
                    </TableCell>
                    <TableCell>
                      <TableCellLayout style={{ minWidth: 180, gap: 4, flexDirection: "column", alignItems: "flex-start" }}>
                        {isActive && job.total === 0 ? (
                          <Spinner size="extra-tiny" label="Waiting…" />
                        ) : (
                          <>
                            <Text size={200}>
                              {doneCount} / {job.total}
                              {job.failed > 0 && (
                                <span style={{ color: tokens.colorPaletteRedForeground1 }}>
                                  {" "}({job.failed} failed)
                                </span>
                              )}
                            </Text>
                            {job.total > 0 && (
                              <ProgressBar
                                value={progressVal}
                                color={job.failed > 0 ? "warning" : job.status === "Completed" ? "success" : "brand"}
                                style={{ width: "100%", minWidth: 120 }}
                              />
                            )}
                          </>
                        )}
                      </TableCellLayout>
                    </TableCell>
                  </TableRow>

                  {isExpanded && job.results && job.results.length > 0 && (
                    <TableRow key={`${job.jobId}-details`}>
                      <TableCell colSpan={6} style={{ padding: 0 }}>
                        <div className={styles.resultsTable}>
                          <Table size="small">
                            <TableHeader>
                              <TableRow>
                                <TableHeaderCell>Resource</TableHeaderCell>
                                <TableHeaderCell>Status</TableHeaderCell>
                                <TableHeaderCell>Detail</TableHeaderCell>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {job.results.map((r, i) => (
                                <TableRow key={i}>
                                  <TableCell>
                                    <Text size={200}>{r.ResourceId.split("/").pop() ?? r.ResourceId}</Text>
                                  </TableCell>
                                  <TableCell>
                                    {r.Status === "Succeeded" ? (
                                      <Badge appearance="tint" color="success" size="small">Succeeded</Badge>
                                    ) : (
                                      <Badge appearance="tint" color="danger" size="small">Failed</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {r.Detail ? (
                                      <Text className={styles.detailText} size={200}>{r.Detail}</Text>
                                    ) : null}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
