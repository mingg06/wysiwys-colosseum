# Settlement order integration

The user authorized settlement orders and Vercel plus Railway hosting on 12 October 2026. This extends the current live app; earlier historical design-plan restrictions do not govern this change.

New guarded treasury creation accepts an optional separate back-office wallet. The runner builds the immutable binding, and both the Next.js route and browser validate its exact program, accounts, authority and flags before signing creation. Reject an authority that is a treasury member. Existing guarded treasuries remain usable.

Add a back-office order form that prepares an unsigned authorization through a Next.js API route and the existing authenticated runner service. Only the named authority signs it. Terms and bytes are validated against packages/shared before signing. Display on-chain order state and consumption details, with no successful status inferred from local storage.

At payment execution, an opted-in treasury requires the external order ID. The existing prepare endpoint passes that identifier to the runner; the runner derives the shared order PDA from the treasury's on-chain authority. The Guard independently enforces all terms. Missing and consumed orders fail closed.

Vercel hosts all existing server routes. Bundle the default public devnet deployment manifest into those routes rather than depending on a filesystem location outside a function. Keep explicit local manifest overrides server-only. Railway is one continuous runner process with finalized listener and CRE triggering, a persistent SQLite volume and sleeping disabled. Secrets are supplied at runtime, never bundled into the browser or image.

Checks: shared wire-format fixtures against the Anchor instruction builder, runner/API tests, app validation tests and typecheck, production build and production API smoke test, Railway image build and runtime/SQLite smoke checks. Live deployment awaits connected accounts and credentials.
