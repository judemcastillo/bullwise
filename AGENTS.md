<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Usage-efficient workflow

- Do not read or print generated root-level JSON histories, datasets, scans, or reports unless the user explicitly asks for a specific artifact. Prefer the compact summaries printed by the existing scripts.
- Treat market-data retrieval, broad setup scans, model training, full backtests, and one-shot validation or holdout evaluation as expensive operations. Do not run them unless the task explicitly requires them.
- During development, run the smallest directly relevant test file. Run `npm run test:analysis` only at a final verification checkpoint or when the user requests the full analysis suite.
- Never inspect or evaluate a sealed validation or holdout split without explicit user authorization and the safeguards required by the applicable preregistration document.
- Keep tool output and final summaries concise. Report key metrics, failures, and artifact paths instead of dumping generated data.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
