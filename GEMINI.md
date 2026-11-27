# Antigravity (T3 Code) conventions

See [AGENTS.md](AGENTS.md) for all Agentic SDLC rules, Bloodtower project conventions, commands, repo map, safety rules, and guardrails. Antigravity loads `AGENTS.md` automatically.

## Tool and subagent mapping

Docs, skills, and playbooks under `.claude/` sometimes use Claude Code tool names and model tiers. When running in Antigravity via T3 Code:

| Doc / skill reference | Antigravity (T3 Code) equivalent |
| --- | --- |
| `Bash` | `run_command` |
| `Read` | `read_file` |
| `Edit` / `Write` | `edit_file` / `write_file` |
| `AskUserQuestion` | `ask_question` |
| `Agent` (subagents) | `invoke_subagent` / `define_subagent` (or T3 `delegate_task` for cross-provider or worktree tasks) |
| `model: opus` / `sonnet` / `haiku` | `pro` / `inherit` / `flash` |

## Shared configuration

- **Skills:** `.agents/skills.json` loads all shared skills directly from `.claude/skills/`.
- **Hooks:** `.agents/hooks.json` enforces the same pre-tool safety guards (`protect-env`, `worktree-guard`, `protect-intent`, `no-main-commit`, `pin-guard`, `test-lock`) and post-edit Biome formatting as `.claude/settings.json`.
- **Role playbooks:** `.claude/agents/*.md` remain canonical; read them with `read_file` when acting as or delegating one of those roles.
