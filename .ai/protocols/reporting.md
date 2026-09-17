# Reporting Protocol

## Worker prompt template

> **ROLE:** [role]
> **OBJECTIVE:** [objective]
> **CONTEXT:** [relevant facts]
> **SCOPE:** [files and boundaries]
> **CONSTRAINTS:** [rules and exclusions]
> **EXPECTED OUTPUT:** [artifacts and evidence]
> **DEFINITION OF DONE:** [observable acceptance]
> **COMPLETION SENTINEL:** [unique exact marker when provider lifecycle is unsupported]
>
> Inspect first. Make the smallest correct change. Reuse existing patterns and avoid unrelated redesign, unnecessary dependencies, and speculative refactors. Run relevant validation and self-review before returning.
>
> Return concise headings: **Findings**, **Changes**, **Verification**, **Risks**, **Recommendation**. Emit the exact completion sentinel as the final line when one was assigned.

## Chief final report

Use concise headings: **DONE**, **VERIFIED**, **ISSUES**, **NEXT**. State changed files, commands or evidence, unresolved risks, retained worker terminals/worktrees, and the next action without overstating certainty.
