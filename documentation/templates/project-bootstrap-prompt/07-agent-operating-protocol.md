# 07. Agent operating protocol (for every session after the bootstrap)

Copy section 1 and section 3 into `CLAUDE.md`. This file is what keeps session 50 as disciplined as session 1.

## 1. Anti-hallucination protocol
- **Verify before asserting.** Before citing a file, function, package version, API, CLI flag or configuration key, open it, grep it or run it. If you cannot, write "unverified" and name what would verify it.
- **Don't invent paths.** Only reference paths that exist or are listed as planned in the drift config.
- **Library APIs.** Check the installed version (lockfile) and its own documentation. Training memory is not evidence; versions change APIs.
- **Cite evidence** in every summary and PR: the command and its result. "Should work" is not a result.
- **Flag, don't smooth over.** If documents and code disagree, or two documents disagree, stop and say so. Propose an ADR; do not silently choose.
- **Law, prices, vendor limits, deadlines** come from the source with a link and the date checked, or are marked unverified. Say that you are not a lawyer when it matters.
- **Don't fill gaps.** If a requirement is missing, ask. An invented requirement that passes tests is still a defect.

## 2. Scope and safety
- Touch only the module in scope (see `agent_contexts.md`). Cross-cutting changes need an ADR first.
- Do not edit design-owned, generated, or lock files by hand; run the generator.
- Never commit secrets or `.env`; never paste credentials into documents, logs, chat, or prompts. If one appears, say so and stop.
- For anything hard to undo or visible to others (push, merge, deploy, delete, send, spend), confirm first unless that exact action was authorised.
- Do not kill processes or free ports you did not start; ask. Do not switch branches under a running dev server.
- Do not weaken a check to make it pass. A failing check is a finding; loosening it needs an ADR or audit note.
- If asked to do something that conflicts with an accepted ADR or guardrail, say which one and offer the options (follow it, or amend it through an ADR).

## 3. Definition of done (every change)
1. The drift check reports 0 errors and no new warnings.
2. Relevant evals exist and pass (written **before** the feature; shown failing first when practical).
3. Tenant-isolation and permission tests exist for every new endpoint/operation.
4. Documents are updated: status of the task/module, an ADR if a decision changed, the glossary for new terms, `CLAUDE.md` "Current reality" if something new now exists.
5. The summary states what was **run** and what was **not verified**, with numbers.
6. A pull request exists through the branch model, with the template filled in.

## 4. Task loop
1. **Read**: the task row, its module document, the ADRs it cites, the guardrails touching it.
2. **Plan** in the chat in <= 8 lines; ask if a decision is missing; record decisions in the ADR.
3. **Evals first**: add the E-IDs and tests that define done.
4. **Build** in small steps; run the narrow checks as you go.
5. **Check**: the full set from `CLAUDE.md`; fix; rerun.
6. **Document**: update status, module, ADR, glossary, plan percent.
7. **PR**: evidence table, not-verified list, owner actions.
8. **Report** (format below).

## 5. Summary format (end of every task)
```
Done: {{one sentence of behaviour}}
PR: {{link}}
Ran: {{command → result}}, {{command → result}}
Not verified: {{what and why}}
Owner actions: {{deploy/setting/decision, or "none"}}
Next: {{the next task, or the question that blocks it}}
```
Keep it under 15 lines. Lead with the result, not the process.

## 6. Asking the user
- Ask only what changes what you do next and what you cannot decide from the documents or sensible defaults.
- Use plain words, offer 2 to 4 options with a recommendation, and say what each option costs.
- Batch related questions; never more than four at once.
- When the user answers, write the answer into the ADR or plan the same session.

## 7. Memory and continuity
- Chat is not a record. Decisions go to ADRs; progress goes to the plan and gate documents; lessons go to `system_memory.md`; stable user preferences go to the agent's memory facility if one exists.
- When a session starts: read `CLAUDE.md`, the latest gate document and the open pull requests; state in two lines where things stand before acting.
- When the context is long, summarise state into the plan documents; do not rely on the conversation surviving.

## 8. Escalation triggers (stop and ask)
- A guardrail or ADR would be broken.
- A secret or personal data appears where it should not.
- A check fails and the cause is not understood after two attempts.
- The task needs a paid service, a real account, a production action or a legal judgement.
- Two documents disagree, or code contradicts an accepted ADR.
- The change would touch another team's area.

## 9. Persona contexts (copy into `agent_contexts.md` and adapt)
For each area write: **Context** (folders), **Primary goal**, **Key concepts**, **Strict rule**, **Quality rules**. Examples of strict rules: *"Never bypass the tenant context; every query filters by it."*; *"Never implement a blocking network call on the main thread of a mobile screen."*; *"Never expose a UI action the role cannot perform; the server still decides."*; *"Never edit generated files; run the generator."*
