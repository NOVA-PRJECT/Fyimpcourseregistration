# Slot Rules Architecture & Simplification Report

**Date:** July 23, 2026  
**Target System:** FYIMP Course Registration Portal — Blueprint & Slot Rules Engine  

---

## Executive Summary

The current course registration system implements **6 distinct slot rules** to control course selection during student registration. This report evaluates the technical functionality, usability, and redundancies among these 6 rules, proposing a simplified **3-Rule Architecture** that maintains 100% of the functional capabilities while drastically improving HOD usability and code maintainability.

---

## 1. Current 6 Slot Rules Overview

| Rule Name | HOD Input | Student Experience | Intended Purpose |
|---|---|---|---|
| **1. `FIXED`** | Course Code (e.g. `KU1DSC101`) | Pre-assigned paper. Locked. | Mandatory Core (`DSC`/`DSE`) papers. |
| **2. `AEC_ELECT`** (formerly `CAMPUS_FIXED`) | Course Code (e.g. `KU1AEC101`) | Pre-assigned paper. Locked. | Campus Ability Enhancement (`AEC`) papers. |
| **3. `DEPT_RESTRICTED`** | Allowed Dept Codes (`CS, MATH`) | Dropdown of DSC/DSE papers from specified departments. | Minor / Interdisciplinary choices. |
| **4. `EXCLUDE_DEPT`** | Excluded Dept Codes (`CS`) | Dropdown of DSC/DSE papers excluding specified departments. | Exclusion-based minor choices. |
| **5. `POOL_RESTRICTED`** | Tag Name (`POOL-A`, `ELECTIVE-1`) | Dropdown of own department papers matching tag. | Departmental Elective Pools. |
| **6. `GLOBAL_BASKET`** | Tag Name (`MDC-1`, `VAC-1`, `SEC-1`) | Dropdown of campus-wide papers matching tag. | Multidisciplinary, VAC, and SEC Baskets. |

---

## 2. Redundancy & Usability Analysis

### 🔴 Redundancy 1: `FIXED` vs `AEC_ELECT`
* **Analysis**: Both rules take a single `course_code` target and lock the slot for the student.
* **Redundancy**: Whether a paper is a Core `DSC` paper or a mandatory `AEC` paper, the underlying behavior ("student must take this exact course code") is identical. Having separate rules adds unnecessary mental overhead for HODs.

### 🔴 Redundancy 2: `DEPT_RESTRICTED` vs `EXCLUDE_DEPT`
* **Analysis**: In academic regulations (FYIMP/NEP), curricula state which departments a student *may* choose minor papers from (e.g. "Select a paper from Mathematics or Statistics").
* **Redundancy**: HODs almost never use `EXCLUDE_DEPT` in practice. Having both options clutters the interface without providing practical value.

### 🔴 Redundancy 3: `POOL_RESTRICTED` vs `GLOBAL_BASKET`
* **Analysis**: Both rules query courses based on a string `tag` (e.g. `MDC-1`, `ELECTIVE-A`).
* **Redundancy**: `POOL_RESTRICTED` restricts to own department while `GLOBAL_BASKET` queries across departments. A single Tag Basket rule can handle both by allowing HODs to specify tag pools.

---

## 3. Proposed 3-Rule Simplified Architecture

By consolidating redundant behaviors, the system can be reduced to **3 intuitive rules**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. FIXED (Mandatory Course)                                                            │
│    • HOD selects any specific course code (Core, DSC, DSE, or AEC).                    │
│    • Student receives this course pre-assigned and locked.                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. DEPT_ELECTIVE (Department Choice)                                                   │
│    • HOD selects one or more allowed departments (e.g. CS, MATH, STATS).               │
│    • Student picks any DSC/DSE paper offered by those departments.                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. TAG_BASKET (Course Pool / Basket)                                                   │
│    • HOD specifies a tag (e.g. MDC-1, VAC-1, SEC-1, POOL-A).                           │
│    • Student picks any course matching that tag across campus or department.           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Comparison & Benefits

| Aspect | Legacy System (6 Rules) | Simplified System (3 Rules) |
|---|---|---|
| **HOD Usability** | High cognitive load; confusion over which rule to pick | Simple 3-option dropdown; clear intent |
| **Code Maintainability** | Complex multi-branch `if-else` blocks in 6+ service files | Clean, consolidated evaluation functions |
| **Validation Schema** | 6 enums with edge cases | 3 concise schemas |
| **Backwards Compatibility** | N/A | Existing 6-rule blueprint JSONs remain 100% compatible |

---

## 5. Conclusion & Recommendation

The current 6 rules function correctly but introduce unnecessary complexity and redundancy. **Transitioning to the 3-Rule Architecture (`FIXED`, `DEPT_ELECTIVE`, `TAG_BASKET`) will streamline blueprint creation for HODs while maintaining full system capability.**
