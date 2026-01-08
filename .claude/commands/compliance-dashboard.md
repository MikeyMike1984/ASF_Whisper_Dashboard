---
description: "Display ASF protocol compliance status and metrics"
---

# Compliance Dashboard

## Purpose
Display current protocol adherence status across all ASF enforcement mechanisms.

## Usage
```
/compliance-dashboard
```

## Execution Steps

### 1. Run Dashboard Script
Execute the compliance dashboard script to gather and display metrics:
```bash
python scripts/compliance-dashboard.py
```

### 2. Review Sections

The dashboard displays:

#### Session Status
- Initialization state (initialized/not initialized)
- Memory Bank files read status
- Session duration and ID

#### Recitation Compliance
- Actions since last activeContext.md update
- Significant actions count
- Compliance status (OK/Warning/Blocked)

#### Agent Consultations
- Recent agent consultations (architect, qa-engineer, security-auditor)
- Required consultations for pending actions
- Consultation gap warnings

#### Context Usage
- Estimated token usage
- Percentage of capacity
- Compaction recommendation status

#### TDD Status
- Tests run status
- Last test result (pass/fail)
- Commit eligibility

#### Pending Items
- Unlogged architectural decisions
- Missing ADR entries
- Required reviews before merge

### 3. Address Warnings

If the dashboard shows warnings or blocking conditions:
1. Follow the suggested remediation steps
2. Re-run dashboard to verify compliance
3. Proceed with work only when status is green

---

## Quick Status Indicators

| Status | Meaning |
|--------|---------|
| [OK] | Protocol requirements met |
| [WARN] | Action recommended soon |
| [BLOCKED] | Must resolve before continuing |
| [PENDING] | Required action not yet completed |

---

## Integration

This command can be run at any time to check compliance status.
Recommended usage:
- At session start (after /session-init)
- Before commits
- Before merge/push operations
- When context warnings appear
