# Epic 1 — Supplier Graduation System

## 1. Objective

Build a reliable pipeline from supplier onboarding to marketplace readiness.

## 2. System Overview

[Insert summary]

## 3. User Experience Flow

(Placeholder — image to be added)

Step-by-step:

1. Supplier onboarding
2. AI scoring
3. Evaluation
4. Transition
5. Marketplace exposure

## 4. Architecture

(Placeholder — image to be added)

## 5. Key Decisions

* Async scoring (non-blocking)
* Separation of scoring vs evaluation
* Deterministic compliance model

## 6. Data Model

* suppliers
* ai_outputs
* supplier_evaluations
* supplier_state_transitions
* compliance_docs (1:1)

## 7. API Surface

* /api/suppliers
* /api/suppliers/:id
* /api/suppliers/marketplace
* admin routes

## 8. Reliability & Safeguards

* Retry logic
* Validation
* Logging + Sentry
* No silent failures

## 9. Known Limitations

* No queue (fire-and-forget)
* Thin marketplace UI

## 10. Phase II / Future Enhancements

* Queue-based scoring
* Marketplace expansion
* Product-level data

## 11. Status

Completed
