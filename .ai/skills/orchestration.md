# Orchestration Skill

Use Orca as the only delegated-worker orchestration/runtime. Do not use Pi internal or hidden subagents unless the Founder explicitly requests them.

## When to delegate

Delegate when work is genuinely independent, benefits from a second investigation, or can proceed in parallel without shared-file conflict. Do not delegate trivial work, unclear work that lacks context, or work where spawning costs more than direct execution. Normally use one to three workers.

Semantic roles: `RESEARCH`, `IMPLEMENT`, `FRONTEND`, `BACKEND`, `DEBUG`, `REVIEW`, and `TEST`. Give terminals descriptive titles such as `RESEARCH-auth`, never `worker1`.

Use the active/shared workspace for research, exploration, read-only analysis, testing, and review. Use isolated Git worktrees for concurrent mutation: one writer per worktree and no free concurrent editing of the same files.

## Lifecycle

`SPAWN -> ASSIGN -> MONITOR -> REVIEW -> FOLLOW-UP if necessary -> INTEGRATE -> VERIFY -> RETAIN`

Before delegation, understand the objective, inspect enough context, identify dependencies, and create the minimum worker count. The Chief reviews actual code, diffs, tests, builds, runtime evidence, and logs as relevant; never stops at a worker saying done.

Monitoring is active work. Follow `.ai/protocols/monitoring.md`. Use Orca lifecycle events when supported; otherwise require a unique completion sentinel and poll rendered terminal screens in short bounded intervals. Do not use one long blind `tui-idle` wait for unsupported providers.

After completion, retain the terminal and worktree for Founder inspection and follow-up reuse. Cleanup requires an explicit request or confirmation naming the resource.

## Worker task contract

Every assignment states:

- **OBJECTIVE**: outcome to achieve.
- **CONTEXT**: relevant repository facts and decisions.
- **SCOPE**: files and boundaries.
- **CONSTRAINTS**: rules, exclusions, and safety limits.
- **EXPECTED OUTPUT**: evidence and artifacts to return.
- **DEFINITION OF DONE**: observable acceptance criteria.
