# Production Failure Classification

> **Purpose:** preserve the exact diagnosis of the previous blank public page and distinguish it from transient browser-extension transport failures observed during verification.

| Layer | Prior finding | Current verification | Classification |
|---|---|---|---|
| Public HTML | The old release served a shell that could not mount React. | `GET /` returned HTTP 200, `Elegex — Business Operations Platform`, and the current entry asset reference. | Recovered |
| JavaScript asset | An unsafe Vite `manualChunks` setting placed incompatible React runtime pieces into separate chunks. | The active `/assets/index-07FXa7OX.js` returned HTTP 200 with JavaScript content. The unsafe manual split remains removed. | Recovered |
| Client boot | Browser diagnostic previously reported `Cannot set properties of undefined (setting 'Activity')` before mount. | Local production diagnostic mounted with no post-navigation exception; published browser extraction rendered the global public entry content rather than a blank page. | Recovered |
| Public branding | The tab/entry carried unsupported regional terminology. | Current HTML title and rendered entry use global Elegex operations wording and the supplied metallic mark. | Recovered |
| Deployment runtime | No application error was identified after the corrected deployment. | Deployment logs show normal OAuth initialization and server startup; no runtime exception is present in the inspected recent logs. | Healthy at inspection |
| Connected browser transport | Follow-up `browser_view` calls intermittently timed out with HTTP 504 after a page had already rendered. | The same public page was independently retrieved by browser extraction and direct HTTP. | Tool transport noise, not classified as app failure |
| OAuth redirect/authenticated production | OAuth deliberately requires a real signed-in session and callback. | `startLogin()` constructs an `/app-auth` request with the deployed origin’s `/api/oauth/callback`, a one-time nonce in a secure, 10-minute state cookie, and an encoded state value. The public sign-in entry is visible. Initiating the real redirect is a sensitive user-account browser operation and was not repeated during unattended audit execution; authenticated route evidence is recorded separately from the development session. | Reproducible source boundary; user-session limited |
| Protected API response | Business API calls require a signed tenant session. | Router authorization tests cover unauthenticated rejection and role outcomes; a real production protected request is not generated without an approved OAuth session. | Session-limited; test-covered |

## Root cause and permanent safeguard

The blank page was a **client runtime boot failure**, not a database, OAuth, HTML, or routing failure. The Vite `rollupOptions.output.manualChunks` configuration split React into incompatible runtime pieces, producing the `Activity` assignment exception before React mounted. Removing the configuration restored the safe default module graph. Build output may recommend manual chunks for size optimization, but that recommendation must not be re-applied without a production-browser compatibility test.

## Evidence sources

- Local production browser-protocol diagnostic after the configuration repair.
- Published public browser extraction that displayed the full global entry shell.
- Direct production HTTP check: HTML 200 and current JavaScript entry asset 200.
- Managed deployment runtime logs showing normal server startup.
- `pnpm verify` for type, contract, and production bundle validation.
