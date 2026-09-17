# Worker Capability Registry

Use this file when choosing a worker or model. Capabilities and availability can drift, so verify current CLI model lists, authentication, quota, and Orca integration before dispatch.

Status labels:

- `VERIFIED`: exercised successfully in this project.
- `AVAILABLE`: installed or listed, but not yet exercised here.
- `BLOCKED`: currently unavailable because of auth, quota, or runtime state.
- `INFERRED`: routing guidance based on model description or family behavior; benchmark before high-risk use.

## Pi

Status: `VERIFIED`

Best use:

- Chief of Staff coordination and Orca control;
- repository inspection and tool-rich local work;
- research, implementation, and verification when the selected Pi model fits.

Pi workers run as independent CLI processes in visible Orca terminals. Do not use Pi's internal or hidden subagents for delegated work.

## Codex

Status: `VERIFIED`, but quota must be checked before dispatch.

Best use:

- implementation, refactoring, tests, and build/debug cycles;
- repository-wide code changes in isolated worktrees;
- provider-backed Orca lifecycle, including observed turn start and supervised `worker_done`.

Known routing:

- `gpt-5.6-sol`: complex implementation and reasoning;
- `gpt-5.6-luna`: lower-cost mechanical execution.

Current quota is not durable knowledge. Query Orca account status before selecting Codex.

## Command Code

Status: `VERIFIED` through visible Orca terminal; Orca provider lifecycle is currently `unsupported`, so use sentinel monitoring.

The installed CLI exposes many model families. Useful routes from its live model descriptions include:

- `deepseek/deepseek-v4-flash`: fast default reasoning, reconnaissance, and bounded review;
- `deepseek/deepseek-v4-pro`: deeper long-context reasoning;
- `moonshotai/kimi-k3` or `kimi-k2.7-code`: long-horizon coding and large-context work;
- `z-ai/glm-5.3-flash`: fast, affordable coding;
- `zai-org/glm-5.3`: frontier coding and difficult technical analysis;
- `minimaxai/minimax-m3`: agentic coding and multimodal work;
- `claude-sonnet-5`: strong speed/intelligence balance;
- `claude-opus-5` or `claude-fable-5-1`: demanding reasoning and long-horizon agents;
- `gpt-6-astra` or `gpt-5.6-sol`: high-complexity reasoning and implementation;
- `gpt-5.6-luna` or `gpt-5.4-mini`: economical bounded execution;
- `google/gemini-3.8-flash`: fast general reasoning;
- `meta/muse-spark-1.2`: coding-oriented large-codebase work.

These mappings are `INFERRED` from the CLI descriptions until benchmarked on AgentKid tasks. Query `commandcode --list-models` before relying on an exact model ID.

## Antigravity (`agy`)

Status: `VERIFIED` through visible Orca terminal using Google AI Pro; Orca provider lifecycle is currently `unsupported`, so use sentinel monitoring.

Installed model routes:

- `gemini-3.8-flash-high`: fast triage, orchestration advice, moderate debugging, and architecture exploration;
- `gemini-3.8-flash-medium`: bounded frontend/backend/test work;
- `gemini-3.8-flash-low`: deterministic edits, boilerplate, formatting, and simple transformations;
- `gemini-3.7-flash-*`: economical discovery, extraction, and test triage;
- `gemini-3.1-pro-high`: deep research, large-context synthesis, and difficult audits;
- `gemini-3.1-pro-low`: structured planning and integration verification;
- `claude-sonnet-4-6`: non-trivial implementation, refactoring, and review;
- `claude-opus-4-6-thinking`: high-uncertainty architecture and high-blast-radius review;
- `gpt-oss-120b-medium`: isolated or privacy-sensitive transformations and fallback analysis.

These task mappings are `INFERRED`; reasoning-budget semantics, latency, tool reliability, context limits, and cost must be measured before high-risk routing. Query `agy models` before dispatch.

## Routing decision

Before dispatch, answer:

1. Does the task require reading, writing, reviewing, research, or UI/browser work?
2. What is the task's ambiguity and blast radius?
3. Does the worker have reliable lifecycle support in Orca?
4. Is the account authenticated and within quota?
5. What is the cheapest verified model capable of producing reliable evidence?

Use strong models for ambiguity, architecture, security, and review. Use fast models for scanning, extraction, mechanical editing, and test execution. Upgrade capability when evidence quality is insufficient.
