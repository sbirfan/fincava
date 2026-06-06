# FINCAVA Operating Rules

## Repository

FINCAVA-HUB is the authoritative repository.

## Architecture Rules

- Preserve existing architecture.
- Extend existing patterns before creating new ones.
- No framework changes without approval.
- No major refactoring without approval.
- No microservices.
- No redesign of onboarding flows without approval.

## Development Rules

- Show implementation plan first.
- Identify affected files.
- Wait for approval before coding.
- Keep changes small and reversible.
- Reuse existing components.
- Run tests after implementation.
- Explain rollback approach.

## Database Rules

- No schema changes without approval.
- No destructive migrations.
- No data deletion.

## Git Rules

- Never commit automatically.
- Never push automatically.
- Show diff before commit.

## Current FINCAVA Phase
Phase	Theme	Timing:
- Phase 1	B2B fixes — stop losing leads, fix broken paths	Now
- Phase 2	Trust pipeline integrity + migration hygiene	Days 15–35
- Phase 3	Revenue loop + concierge operations	Days 36–60
- Phase 4	Pre-retail setup	After Phase 3 gate
- Phase 5	Retail storefront build	After Phase 4 gate
- Phase 6:
Managed B2B Sourcing Concierge
Primary goals:

- Supplier onboarding
- Buyer onboarding
- Trust building
- RFQ routing
- Translation support
- Qualified introductions

Human closes deals.

- Cloudflare migration	Platform move	Separate initiative, timed independently

## Current Priorities

1. Stabilize existing platform
2. Complete onboarding gaps
3. Compliance Engine foundation
4. Verification workflows
5. Buyer acquisition support

## Revised Full Plan — Ready for Final Approval
Phase	Theme	Key items:

- Phase 1	B2B fixes	FIN-003, FIN-011, FIN-035, FIN-036, FIN-043, FIN-008
- Phase 2	Trust pipeline + migration hygiene	FIN-023, FIN-019, FIN-041, FIN-009, FIN-058/059
- Phase 3	Revenue loop + concierge ops	FIN-010, FIN-006, FIN-033, FIN-096
- Phase 4	Pre-retail setup	Migration hygiene verified, backups confirmed, B2B smoke test, ENABLE_RETAIL flag, interaction-types.ts, Stripe sandbox configured
- Phase 5	Retail build	Manual + Stripe payments; Wompi when NIT ready
- Cloudflare	Platform migration	Separate initiative, not blocking
