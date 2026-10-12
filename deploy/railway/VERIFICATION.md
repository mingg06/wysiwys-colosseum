# Local deployment verification

Verified on 13 October 2026. These are local checks, not a hosted deployment or live DON/TEE evidence.

| Check | Result |
| --- | --- |
| Default simulation Docker image build | Passed, including CRE archive SHA-256 verification |
| Packaged CLI/runtime | CRE 1.35.0 and Bun 1.3.5 run successfully |
| Workflow tests inside the image | 82 passed |
| Runtime environment and connectivity fixture tests | 3 passed |
| Container finalized listener and health | Passed with local HTTP/WebSocket fixtures |
| Anonymous order preparation | HTTP 401 |
| Mounted SQLite cursor after container restart | Preserved |
| Idle memory | About 127 MiB; excludes CRE compilation peak |

Commands are documented in [the setup guide](../README.md#local-checks). The smoke helper creates and removes its own uniquely named container and volume. Secret parsing tests check that malformed private policy JSON cannot leak values in errors. Connectivity tests cover devnet network validation and finalized subscription acknowledgement using local fixtures.

Not yet verified: Railway Full Trial status and real outbound RPC/CRE connectivity, simulation peak memory under the trial's RAM limit, hosted Vercel routes, an upgraded devnet Guard, or a real hosted order mismatch/shared-order race. These require account access, configured server-only credentials and deployment transactions. No public demo URL is claimed.
