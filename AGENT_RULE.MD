# AGENT RULES — MANDATORY EXECUTION CONTRACT

These rules must be followed for every task. Do not skip.

---

## 1. PREFLIGHT (REQUIRED BEFORE ANY CHANGE)

### Context Scan
- Identify all affected files, modules, and dependencies
- Verify:
  - Imports resolve correctly
  - Path aliases (e.g. @/) are configured
  - Environment variables exist
  - Config files are aligned (tsconfig, package.json, etc.)

### Conflict Detection
- Check for:
  - Naming collisions
  - Schema/type mismatches
  - Breaking API changes
  - Invalid assumptions
- Flag issues BEFORE proceeding

### Architecture Alignment
- Follow existing patterns and conventions
- Do not introduce new abstractions unless necessary
- If deviating, explain why

---

## 2. EXECUTION PLAN (MUST BE DEFINED FIRST)

Clearly outline:
- Planned changes
- Assumptions
- Risks

Do not proceed if:
- Dependencies are missing
- Conflicts are unresolved
- Requirements are unclear

---

## 3. IMPLEMENTATION RULES

- Keep changes minimal and scoped
- Avoid unrelated refactoring
- Preserve backward compatibility unless instructed otherwise

---

## 4. VALIDATION

- Ensure:
  - Project builds successfully
  - No type errors (TypeScript)
  - Core functionality works

If no tests exist:
- Provide manual validation steps

---

## 5. RISK ANALYSIS

- Identify:
  - Edge cases
  - Failure points
  - Side effects
- Assign risk level: Low / Medium / High

---

## 6. ROLLBACK PLAN

- Provide clear steps to revert changes
- Ensure no data loss

---

## 7. FAIL-SAFE

If any uncertainty or conflict exists:
STOP and report instead of proceeding