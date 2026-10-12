import { defineRailway, preserve, project, service, volume } from "railway/iac";

// Source is attached separately and pinned to the reviewed commit. This file never follows a push.
export default defineRailway(() => {
  const data = volume("runner-data", { sizeMB: 500 });
  const runner = service("runner", {
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "deploy/railway/Dockerfile",
      watchPatterns: ["services/runner/**", "packages/**", "workflow/**", "deployments/**", "deploy/railway/**", "package.json", "package-lock.json", "tsconfig.base.json", ".dockerignore", "app/package.json"],
    },
    deploy: {
      numReplicas: 1,
      sleepApplication: false,
      requiredMountPath: "/data",
      healthcheckPath: "/status",
      healthcheckTimeout: 180,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 5,
      overlapSeconds: 0,
      drainingSeconds: 20,
    },
    volumeMounts: { "/data": data },
    env: {
      NODE_ENV: "production", PORT: "8787", RUNNER_DB_PATH: "/data/runner.db", BACKFILL_INTERVAL_MS: "60000",
      ...Object.fromEntries([
        "SETTLEMENT_TOKEN", "HELIUS_DEVNET_RPC_URL", "HELIUS_DEVNET_WS_URL",
        "CRE_API_KEY", "CRE_PROJECT_DIR", "CRE_WORKFLOW", "CRE_TARGET", "CRE_BROADCAST", "CRE_TIMEOUT_MS",
        "CRE_QUICKNODE_SOLANA_DEVNET_RPC_URL", "CRE_HELIUS_SOLANA_DEVNET_RPC_URL", "CRE_ALCHEMY_SOLANA_DEVNET_RPC_URL",
        "CRE_SCORECHAIN_SANCTIONS_API_KEY", "CRE_SOLANA_PRIVATE_KEY", "CRE_ETH_PRIVATE_KEY", "CRE_POLICY_DOCUMENT",
        "POLICY_FETCH_TOKEN", "CRE_POLICY_STORE_TOKEN", "REVIEW_TOKEN", "ADMIN_TOKEN",
        "CRE_WORKFLOW_ID", "CRE_GATEWAY_PRIVATE_KEY", "CRE_GATEWAY_URL", "CRE_TRIGGER_URL", "CRE_TRIGGER_TOKEN",
      ].map(name => [name, preserve()])),
    },
  });
  return project("wysiwys-colosseum", { resources: [runner, data] });
});
