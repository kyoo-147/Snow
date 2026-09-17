# Worker Monitoring Protocol

The Chief must actively observe delegated work. A long blocking wait is not sufficient.

## Signal hierarchy

Use the strongest available signal in this order:

1. Orca supervised lifecycle messages such as `worker_done`, questions, or escalations.
2. Provider-backed turn state such as `turn_started` and supported `tui-idle` detection.
3. A unique completion sentinel required by the worker prompt.
4. Rendered terminal output, cursor growth, and `lastOutputAt` changes.
5. Direct inspection or a narrow follow-up question.

If a send receipt reports `provider: unsupported`, do not rely on `terminal wait --for tui-idle` as the only completion mechanism.

## Completion sentinel

Every unsupported-provider assignment must end with a unique line:

`WORKER_DONE:<role>:<task-id>:<outcome>`

Allowed outcomes are `SUCCEEDED`, `BLOCKED`, and `FAILED`. The marker reports worker state only; the Chief must still verify the claimed result.

## Polling

- Read the rendered screen with `orca terminal read --screen`, because interactive TUIs repaint output.
- Poll active unsupported-provider workers every 5 to 15 seconds for short work and every 30 to 60 seconds for long work.
- Track the latest cursor, `lastOutputAt`, output hash, current phase, and expected sentinel.
- Never issue one long blind wait when a provider lacks lifecycle support.
- When supervising several workers, poll them as one batch.

The helper `.ai/scripts/watch-orca-worker.ps1` performs bounded, read-only sentinel polling. It never sends input, closes a terminal, or deletes a worktree.

## Stall handling

A timeout is a checkpoint, not proof of failure.

1. If output is changing, continue observing.
2. If output is unchanged for the soft-stall threshold, inspect the rendered screen and terminal metadata.
3. If still unclear, send one narrow status request; do not resend the original task.
4. If the worker reports a blocker, resolve or escalate it.
5. If the process exits without a valid result, preserve the transcript and mark the outcome `UNKNOWN` until inspected.

Never infer success, failure, or process death from silence alone.

## Verification and retention

After detecting completion:

1. read the final worker output;
2. inspect actual files, diff, tests, build, runtime, or artifacts as relevant;
3. record the result and residual risks;
4. retain the worker terminal and worktree for transcript inspection and follow-up reuse.

Do not close, release, remove, or clean up a worker terminal or worktree unless the Founder explicitly requests it or confirms the named resource may be removed.
