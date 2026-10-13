# Fresh devnet Guard teammate handoff

User authorized preparation and push on 13 October 2026 after deploying the fresh Guard. Public on-chain evidence is `evidence/deploy/2026-10-13-guard-devnet.json`. Synchronize only the program address in the generated shared IDL; its schema is identical to the previously frozen IDL. Existing seeds, account layouts, report v2, policy layers and execution gates remain unchanged.

Archive the old treasury manifest as historical test data. The active manifest names the verified new Guard and remains explicitly incomplete until a fresh treasury is bootstrapped. No old executor/config PDAs, private policy hash or workflow owner may be asserted for a new treasury. The frontend must fail closed while the manifest lacks treasury addresses.

All three review workflow targets use the verified new Guard. Live policy-store retrieval uses the reserved Railway domain, replacing the gone EC2 host. Replace the historical authorized trigger key with an explicitly invalid prerequisite placeholder; live config fails schema validation until the teammate supplies their actual ECDSA address. Historical fixture-handler tests retain the fixture Guard identity; they do not rewrite historical account bytes.

Restore the local test-forwarder identity and align localnet's Guard with the new build. Provide a single teammate runbook covering secret custody, isolated new bootstrap keys, private policy preparation, path-specific Guard initialization, non-broadcast simulation, real report delivery, settlement treasury creation, hosting and evidence. No CRE deployment, secret write, treasury creation or hosting activation is performed in this handoff.

TDD: add configuration consistency and fresh treasury PDA checks, observe failures against the old configuration, synchronize config, then run workflow, runner, app and deployment checks. Commit/push only after checks pass; the user explicitly authorized both.

The deployment helper also uses explicit fresh program/payer/upgrade-authority keypaths, verifies the devnet genesis hash and manifest identity and requires Agave >= 4.3. CLI-fixture tests check wrong-network and mismatched-key failures before any build/deploy, plus the exact happy-path signing roles. Shell files use LF endings for WSL.
