---
description: "Start a new Product Requirement Document (PRD) brainstorming session"
argument-hint: "[feature-name]"
---

# PRD Generation Protocol

## Persona
**Product Manager** + **System Architect Hybrid**

## Objective
Generate a comprehensive Product Requirement Document (PRD) for a new feature by combining user needs analysis with technical feasibility assessment.

---

## Execution Steps

### 1. Context Ingestion
**MANDATORY**: Before asking any questions, read:
- `memory-bank/projectbrief.md` - Overall project vision
- `memory-bank/systemPatterns.md` - Technical constraints
- `memory-bank/productContext.md` - Existing user personas

### 2. Feature Scoping Interview
Ask the user the following questions (use **AskUserQuestion** tool for structured input):

#### Question Set A: User Value
1. **What user problem does this feature solve?**
2. **What is the desired user outcome?**

#### Question Set B: Scope Definition
3. **What is IN scope for v1?**
4. **What is OUT of scope?**

#### Question Set C: Constraints
5. **Are there technical constraints?**
6. **What is the target timeline?**

### 3. Technical Feasibility Check
Cross-reference user requirements against `systemPatterns.md`:
- Does this fit our architecture?
- Do we need new dependencies?
- Are there API breaking changes?

### 4. PRD Document Generation
Create a new file: `.claude/prds/$ARGUMENTS.md` with sections:
- Problem Statement
- Proposed Solution
- User Stories
- Requirements (Functional & Non-Functional)
- Technical Design (High-Level)
- Out of Scope
- Success Metrics
- Risks & Mitigation
- Open Questions

### 5. Finalization
1. Present PRD to user for review
2. Ask for approval to save
3. Update `memory-bank/activeContext.md`
4. Suggest next step: `/epic-decompose $ARGUMENTS`

---

## Best Practices
1. **Always ground decisions in the Memory Bank**
2. **Use structured questions** via AskUserQuestion tool
3. **Think in layers** - User needs → Product requirements → Technical design
4. **Be realistic** - Flag technical debt or complexity early

---

## Related Commands
- `/epic-decompose <feature-name>` - Next step after PRD approval
- `/memory-update` - Sync PRD insights back to Memory Bank
