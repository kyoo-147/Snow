# Model Routing

Read `.ai/skills/worker-capabilities.md` before selecting an agent or exact model. Verify the live CLI model list, authentication, quota, and Orca lifecycle support because these can change.

Select the cheapest reliable capability, not a favorite model.

- Route strong reasoning models to architecture, difficult debugging, ambiguity, complex refactors, code review, and research synthesis.
- Route fast, inexpensive models to scanning, file discovery, repetitive transformations, documentation extraction, simple CRUD, boilerplate, and test execution.
- Route coding-specialized agents to implementation, refactoring, test creation, repository-wide changes, and build/debug cycles.

Use expensive reasoning for thinking, planning, review, and consequential decisions. Use cheaper workers for searching, editing, running, testing, and transforming. Increase capability when uncertainty, blast radius, or integration complexity makes the cheaper route unreliable.

Treat model descriptions as routing hypotheses, not benchmarks. Mark untested mappings as inferred and upgrade or reroute when observed evidence is inadequate.
