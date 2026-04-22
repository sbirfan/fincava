> No manual file edits. All changes must go through Replit prompts.

# Execution System

## Replit-First Execution Policy

All deterministic and repeatable tasks must be executed via Replit Agent.

This includes:

* Code implementation
* Test execution
* Validation checks
* Documentation updates (/ops/*.md)
* Script execution (e.g., export-docs)
* File edits and formatting

---

Manual actions are NOT allowed for:

* Editing code
* Updating documentation
* Running tests
* Performing validation steps

---

ChatGPT responsibilities:

* Define architecture
* Generate unified prompts (SPEAR)
* Validate results
* Generate patch prompts
* Generate documentation update prompts

---

Replit responsibilities:

* Execute prompts exactly
* Apply file changes
* Run tests and validations
* Report structured output

---

Execution loop:

1. ChatGPT → provides prompt
2. Replit → executes
3. Results → reviewed by ChatGPT
4. ChatGPT → provides:

   * patch prompt (if needed)
   * docs update prompt
5. Replit → applies updates
