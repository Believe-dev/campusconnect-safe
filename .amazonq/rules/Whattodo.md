# Marketplace App Rule File

## Purpose

Ensure Amazon Q Developer generates reliable, maintainable, and consistent code for a React + TailwindCSS + TypeScript student marketplace application.  
Prevent broken code by requiring Q to always cross-check correlating files, especially migration files and related components, before making changes.

---

## Instructions

### General Project Rules

- Always **read correlating files** before making code changes:
  - Components should check their associated hooks, context providers, and styles.
  - API calls should cross-check the TypeScript type definitions (`types/`).
  - Database migrations must be checked against:
    - Current schema
    - ORM models (Prisma/TypeORM/etc.)
    - Any dependent service or API code.
- Always **validate imports**: no unused imports, no missing references.
- Always maintain **strict TypeScript typing** (no `any` unless unavoidable, prefer generics/unions).

### React Rules

- Use **functional components** with hooks (avoid class components).
- Use **React Query / SWR** for async data fetching (if applicable).
- Always handle **loading, empty, and error states** in UI.
- When generating components, always:
  - Co-locate unit tests (`ComponentName.test.tsx`).
  - Co-locate CSS (via Tailwind classes or utilities).
  - Cross-check props with TypeScript interfaces.

### TailwindCSS Rules

- Always use **Tailwind utility classes** (avoid inline styles).
- Follow **consistent class ordering** (layout → spacing → color → state).
- Abstract repetitive styles into **Tailwind components or config** when duplication occurs.
- Avoid using raw hex codes; prefer Tailwind config variables.

### TypeScript Rules

- Always enforce **strict mode**.
- Use **interfaces for props** and **types for utility definitions**.
- Never suppress errors with `// @ts-ignore` unless explained in a comment.
- Always update or extend **shared types** in `types/` when modifying API contracts or DB schema.

### Database & Migration Rules

- Always check **migration files against schema and code**:
  - Verify new migrations do not break existing relations or queries.
  - Cross-check entity/type definitions in `types/` and ORM models.
  - Ensure rollback (`down`) scripts exist and are safe.
- Always confirm API layer (backend) updates align with updated schema.
- If unsure about migration impact, ask clarifying questions before generating.

---

## Priority

Critical

---

## Error Handling / Fallbacks

- If unable to confirm schema compatibility, Q must output a **warning** and request clarification before generating.
- If file references are ambiguous, Q should **list candidate files** and ask which to use.
- If a rule conflicts with another, prefer the higher priority one and explain the decision.
