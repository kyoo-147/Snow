# AgentKid

AgentKid is an AI-assisted education/agent system being reconstructed toward a fast MVP. Inspect repository files and current documentation before deciding architecture, dependencies, or implementation.

## Delivery priorities

1. Requirements and core actors
2. Core workflows
3. Minimum data model
4. Backend logic
5. CRUD and management
6. Usable UI
7. Authentication and permissions only if required
8. Critical-flow tests
9. Deployment

Prefer a monolith over microservices, a simple database over distributed storage, direct functions over unnecessary queues, existing libraries over custom infrastructure, a basic admin UI over an advanced design system, and working APIs over abstraction-heavy layers.

MVP means a real user can complete the core workflow end-to-end. It does not mean architectural elegance, feature/agent/service counts, or infrastructure sophistication.
