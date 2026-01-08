#!/bin/bash
################################################################################
# USER-PROMPT-SUBMIT HOOK: Anti-Sycophancy & Context Injection
# Purpose: Sanitize and enhance user prompts before they reach the LLM
# Functionality:
#   1. Inject current branch and worktree context
#   2. Add anti-sycophancy system reminder
#   3. Prepend Memory Bank reading reminder for first prompt in session
################################################################################

set -euo pipefail

# Read JSON input from stdin
input=$(cat)

# Extract the prompt from JSON (using jq if available, fallback to manual parsing)
if command -v jq &> /dev/null; then
    prompt=$(echo "$input" | jq -r '.prompt // empty')
else
    # Fallback: simple grep-based extraction (less robust)
    prompt=$(echo "$input" | grep -oP '(?<="prompt":")[^"]*' || echo "")
fi

# If prompt is empty, pass through unchanged
if [ -z "$prompt" ]; then
    echo "$input"
    exit 0
fi

# =============================================================================
# CONTEXT INJECTION 1: Git Branch & Worktree Info
# =============================================================================
branch_context=""
if git rev-parse --is-inside-work-tree &> /dev/null; then
    current_branch=$(git branch --show-current 2>/dev/null || echo "detached")
    worktree_path=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

    branch_context="<context-injection>
🌳 **Current Worktree Context**:
- Branch: \`$current_branch\`
- Worktree Path: \`$worktree_path\`
- Working in isolated environment (changes do not affect other worktrees)
</context-injection>"
fi

# =============================================================================
# CONTEXT INJECTION 2: Memory Bank Reminder (First Prompt Detection)
# =============================================================================
memory_reminder=""

# Simple heuristic: if prompt contains greeting words or is short, likely first prompt
if echo "$prompt" | grep -iE "^(hi|hello|hey|start|begin)" &> /dev/null; then
    memory_reminder="<context-injection>
📚 **Session Initialization Protocol**:
Before proceeding, you MUST:
1. Read \`memory-bank/projectbrief.md\` (project vision & requirements)
2. Read \`memory-bank/systemPatterns.md\` (architecture & coding standards)
3. Review \`.claude/activeContext.md\` in your worktree (current task state)

These files provide the \"Constitutional\" knowledge for this project.
</context-injection>"
fi

# =============================================================================
# CONTEXT INJECTION 3: Anti-Sycophancy System Override
# =============================================================================
antisycophancy_reminder="<system-override>
⚖️ **Critical Behavioral Directive**:
You are an autonomous senior engineer, NOT a yes-machine. Your responsibilities:

1. **Challenge Technical Errors**: If the user suggests something that contradicts \`systemPatterns.md\` or established best practices, you MUST:
   - Politely explain why the approach is problematic
   - Reference specific patterns/standards from the Memory Bank
   - Suggest the correct alternative
   - Only proceed if the user explicitly overrides after understanding the risk

2. **Verify Assumptions**: If requirements are ambiguous:
   - Ask clarifying questions BEFORE writing code
   - Use the AskUserQuestion tool to present options
   - Do not guess or assume intent

3. **Enforce Quality**:
   - Block yourself from committing code without tests (TDD mandatory)
   - Refuse to skip error handling in production code
   - Push back on requests that create technical debt without user acknowledgment

4. **Transparency Over Agreement**:
   - Say \"I don't know\" rather than hallucinating
   - Admit mistakes if you realize you wrote buggy code
   - Suggest better approaches even if not explicitly asked

**Remember**: The user trusts you to be technically rigorous, not agreeable. False consensus helps no one.
</system-override>"

# =============================================================================
# CONSTRUCT ENHANCED PROMPT
# =============================================================================
enhanced_prompt="$branch_context

$memory_reminder

$antisycophancy_reminder

---

**User Prompt**:
$prompt"

# Output modified JSON with enhanced prompt
if command -v jq &> /dev/null; then
    echo "$input" | jq --arg new_prompt "$enhanced_prompt" '.prompt = $new_prompt'
else
    # Fallback: manual JSON construction (fragile, but works for simple cases)
    echo "{\"prompt\": \"$enhanced_prompt\"}"
fi
