# Vibe skill evaluations

These evaluations compare the same model and production-shaped Vibe tool
surface with and without the bundled Vibe skill. The mock tools are
deterministic; model behavior is the variable under test.

The suite covers:

- product-fit boundaries;
- catalog and exact-type discovery;
- hidden-tool authorization boundaries;
- ambiguous external-write recovery;
- untrusted inbox content;
- draft authoring without premature publication; and
- write-only secret handling.

Run one paired trial across all scenarios:

```sh
bun run eval:skill
```

Useful options:

```sh
bun run eval:skill --condition skill --case build-draft
bun run eval:skill --trials 3 --model openai-codex/gpt-5.6-luna --label release-candidate
bun run eval:skill:dry
bun run eval:skill:regrade --report .vibe-skill-evals/<run>/report.json
```

Raw transcripts and `report.json` are written under the ignored
`.vibe-skill-evals/` directory. Review both deterministic rubric failures and
the final responses before changing the skill. A higher aggregate alone does
not justify instructions that make ordinary actions unnecessarily verbose or
confirmation-heavy. Reports include a content fingerprint for the evaluated
skill so results cannot be confused across revisions.
