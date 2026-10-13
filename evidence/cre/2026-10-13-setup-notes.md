# CRE setup observations

These notes summarize observed tool results, not an unedited CLI transcript.

- Two initial full native dry runs reached a 3-of-3 matching account snapshot, then failed with `POLICY_INVALID: the policy secret is not valid JSON`. The private document had already passed shared validation; configuring `CRE_POLICY_DOCUMENT` in the ignored CRE environment with the existing policy-registry CLI fixed secret loading. The final successful transcript is `2026-10-13-review-don-local.log`.
- The initial request (transaction index 1) expired during setup. The final local diagnostic returned approve/reason 0 but explicitly `withinDeadline: false` and `reportSubmitted: false`. A new transaction index 2 was created for the live path. No expired request was approved on chain.
- The first Vault browser authorization returned `access_denied`. It was stopped and retried. Five required secrets were created for the verified organization owner; the successful transcript is `2026-10-13-live-secrets-create-retry.log`.
- Vault CLI gateway validation was skipped by its default configuration: the CLI did not independently verify the gateway's encryption key and response signatures. Secret values were not displayed. This deployment provides ordinary DON execution and no TEE attestation.
- Workflow deployment, live execution SUCCESS, finalized production-forwarder report delivery and finalized guarded payout have separate evidence files. Only the clean live payment was exercised in this deployment turn.
