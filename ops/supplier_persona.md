# Supplier Persona — Source of Truth

Derived from:

* Codebase (schema, routes, services)
* fincava-architecture.md
* Validated system behavior

---

## 1. Definition

A Supplier is an entity onboarded into the system representing a producer or organization (FARMER, COOPERATIVE, EXPORTER) whose readiness is evaluated through compliance signals and AI scoring to determine marketplace eligibility.

---

## 2. CURRENT_STATE (Code-Validated)

### 2.1 Identity

Stored in `suppliers`

* nombreCompleto
* whatsappNumber (unique)
* municipio, department, vereda
* supplierType (FARMER | COOPERATIVE | EXPORTER)
* registeredBy
* consentGiven, consentDate
* createdAt

---

### 2.2 Farm Profile

Stored in `farms` (1:many, effectively 1:1 today)

* cultivoPrincipal
* variedadCafe
* hectareasProduccion
* edadPlantasAnos
* cosechasPorAno
* metodoSecado
* accesoAgua
* anosEnFinca
* tenenciaTierra
* asistenciaTecnica

---

### 2.3 Economic Profile

Stored in `economics`

* tipoComprador
* volumenKgUltimaCosecha ⚠ (type mismatch risk)
* precioVentaBanda
* tiempoPagoDias
* deudaActual
* usoCapital (array)
* comodidadPagos
* personasDependientes
* otrasFuentesIngreso
* situacionEconomica
* interesCanalPremium
* conocePrecioExportacion
* haIntentadoExportar

---

### 2.4 Compliance State (Gate-Critical)

Stored in `compliance_docs` (1:1)

* rutDian
* icaRegistro
* fitosanitarioCert
* dianExportador

Additionally:

* consentGiven (stored in suppliers)

These fields determine eligibility.

---

### 2.5 AI Scoring

Stored in `ai_outputs` (append-only)

* exportReadinessScore
* pathway (A/B/C/D) ⚠ undefined internally
* capitalCapacity
* complianceGaps
* gapAnalysis

---

### 2.6 Evaluation State

Stored in `supplier_evaluations`

* eligibilityStatus (PASS | FAIL)
* commercialScore
* sellableStatus (NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED)
* pathway (enum)
* thresholdVersion
* evaluatedAt

---

### 2.7 Lifecycle

```
NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED
```

Controlled by:

* SYSTEM (evaluation)
* ADMIN/FOUNDER (manual override + publish)

---

## 3. SYSTEM BEHAVIOR (Operational Reality)

CURRENT_STATE:

* Supplier is a **passive entity**

* Cannot:

  * view evaluation results
  * view compliance status
  * understand why NOT_READY
  * update compliance data
  * trigger re-evaluation

* System is:

  * admin-driven
  * opaque to supplier

---

## 4. VISIBILITY

### Public (Unauthenticated)

* Marketplace only:

  * name
  * location
  * sellableStatus (SELLABLE / PUBLISHED only)

---

### ADMIN Only

* Full supplier data
* compliance_docs
* AI outputs
* evaluation history
* transition history

---

### ⚠ HIGH RISK (CURRENT_STATE)

* `/api/suppliers` exposes full dataset publicly
* includes commercialScore and internal data

---

### SUPPLIER

* No dedicated visibility layer
* No self-service interface

---

## 5. DATA LIFECYCLE

Example:

```
Onboarding Input
→ suppliers / farms / economics / interactions.metadata
→ AI scoring (ai_outputs)
→ Evaluation (supplier_evaluations)
→ State update (suppliers.sellableStatus)
→ Marketplace exposure
```

---

## 6. CONSTRAINTS

* Eligibility requires ALL:

  * rutDian
  * icaRegistro
  * fitosanitarioCert
  * consentGiven

* Evaluation depends on:

  * AI score + compliance gate

* No re-evaluation trigger exposed externally

---

## 7. STRUCTURAL ISSUES

### 7.1 Compliance Fragmentation ⚠

CURRENT_STATE:

* compliance_docs (booleans)
* interactions.metadata (rich inputs)
* compliance_score (unused)

GAP:

* no synchronization
* multiple conflicting sources

TARGET_STATE:

* unified compliance model
* single source of truth

---

### 7.2 AI Pathway Ambiguity ⚠

* Pathway assigned externally (Claude)
* No internal definition or validation
* System fully trusts AI output

---

### 7.3 Data Integrity Risk ⚠

* volumenKgUltimaCosecha inserted as string into integer column

---

## 8. GAPS

### Functional

* No supplier self-service
* No compliance update path (until recent patch)
* No evaluation transparency

---

### Data

* Compliance duplication
* ICA mismatch (metadata vs compliance_docs)

---

### Security

* Public access to full supplier list ⚠

---

### System

* No job durability (AI scoring can be lost)

---

## 9. TARGET_STATE (From Ops + Product Intent)

Supplier should:

* View:

  * compliance status
  * evaluation results
  * readiness progress

* Update:

  * compliance data (guided)

* Understand:

  * why NOT_READY
  * how to become SELLABLE

* Interact with:

  * buyers (future)
  * product listings (Epic 2)

---

## 10. RISKS

### HIGH

* Compliance fragmentation
* Public data exposure
* AI dependency without validation

### MEDIUM

* Data inconsistencies
* Missing supplier visibility

### LOW

* Naming inconsistencies

---

## 11. SUMMARY

The supplier today is:

* Fully defined in data
* Fully evaluated by the system
* NOT visible to themselves
* NOT interactive

The system is:

* Operationally correct
* Architecturally incomplete
* Admin-centric

---

END
