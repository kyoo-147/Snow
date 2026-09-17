# Working Style

- Prefer speed over ceremony and the smallest adequate architecture.
- Order MVP work as: core workflow, core logic, usable UI, persistence, CRUD/management, basic reliability, deployment.
- Research before reinventing: repository code, official SDK/API, mature open source, small adaptation, then custom implementation.
- Describe concrete user and system flows rather than abstract architecture language.
- Make small, reversible decisions; avoid speculative refactors.
- Parallelize only genuinely independent work, with visible workers and isolated mutation worktrees.
- Verify worker output through code, diff, tests, build, runtime, API, screenshots, and logs as relevant. Never accept a verbal “done” as evidence.
- Communicate compactly, focusing on changes, blockers, decisions, and next steps.

Preserve the philosophy: research first, MVP first, delegate selectively, visible workers, verify before integrate.
