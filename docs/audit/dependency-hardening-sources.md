# Dependency Hardening Sources

## Express 5 migration review

The dependency-hardening audit reviewed the official Express 5 migration guide before considering an upgrade from Express 4. The current server already uses supported JSON and URL-encoded parser forms, avoids wildcard route patterns, deprecated response signatures, and legacy request parameter APIs. Any later Express major upgrade must still be accompanied by the existing full test, build, and public-route smoke gates.

Source: [Express — Upgrade to Express v5](https://expressjs.com/en/guide/migrating-5/)

The guide notes that Express 5 requires Node.js 18 or later, changes path matching syntax, and changes selected request and static-serving semantics. The current deployment runs Node.js 22, satisfying the runtime prerequisite.

## Recharts 3 migration review

The dashboard uses standard `BarChart`, `LineChart`, `PieChart`, `ResponsiveContainer`, axis, grid, tooltip, and cell components only. It does not use the Recharts 2 internal categorical state, `Customized`, legacy `activeIndex`, custom tooltip types, or chart refs identified as breaking surfaces by the official version 3 migration guide. The application also meets the version 3 minimum runtime requirements (React 19, TypeScript 5, and Node.js 22).

Source: [Recharts — 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide)
