---
title: Parallel AI-agent development workflow
folder: bulqit
order: 6
summary: Joel ran several coding agents in parallel git worktrees, which produced a large share of his 454 merged pull requests, and wrote the guard tests and handbook that kept their code in check.
stats:
  - 454 merged PRs
  - 49% of merges to main
  - 646 issues in 5 months
---

## The problem

Bulqit had two in-house engineers and more work than two people could do by hand. The final release cycle was scoped in Linear at 487% of the team's capacity.

## What Joel did

Joel designed a development workflow that runs several AI coding agents at once, each in its own git worktree. A worktree is a separate checkout of the same repository, so agents can work on different issues in parallel without touching each other's files.

His tools included Claude Code, Hermes, OpenCode and Ollama.

The workflow produced a large share of Joel's 454 merged pull requests. Those made up 49% of everything merged to the main branch.

## Keeping agent-written code honest

More pull requests only help if they're correct. Joel set up two safeguards:

- **CI guard tests.** He wrote 23 of the repository's 39 guard tests, which fail the build when a known flaw returns. Agent-written code is checked automatically, before and alongside human review.
- **An engineering handbook.** He wrote the team's handbook, so agents and people worked from the same conventions.

## Triage and delivery

Joel ran issue triage and delivery in Linear and Sentry with the COO. He completed 646 issues in five months.

In the final release cycle, the one scoped at 487% of capacity, the team completed 154 of 195 issues (79%). Joel completed 83 of them.
