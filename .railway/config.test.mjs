import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayContext, project } from 'railway/iac';

test('runner configuration preserves secrets and mounts durable storage without sleeping', async () => {
  const { default: definition } = await import('./railway.ts');
  const rendered = await definition(createRailwayContext({ environment: 'production' }), project);
  const runner = rendered.resources.find(resource => resource.type === 'service');
  const volumes = rendered.resources.filter(resource => resource.type === 'volume');
  assert.equal(rendered.resources.length, 2);
  assert.equal(runner.deploy.sleepApplication, false);
  assert.equal(runner.deploy.numReplicas, 1);
  assert.equal(runner.deploy.requiredMountPath, '/data');
  assert.equal(runner.build.dockerfilePath, 'deploy/railway/Dockerfile');
  assert.equal(runner.volumeAttachments['runner-data'].volume, volumes[0].address);
  assert.equal(runner.volumeAttachments['runner-data'].mountPath, '/data');
  assert.equal(runner.variables.RUNNER_DB_PATH.value, '/data/runner.db');
  for (const name of ['SETTLEMENT_TOKEN', 'HELIUS_DEVNET_RPC_URL', 'CRE_API_KEY', 'CRE_SOLANA_PRIVATE_KEY', 'CRE_ETH_PRIVATE_KEY', 'CRE_POLICY_DOCUMENT']) {
    assert.deepEqual(runner.variables[name], { type: 'preserve' });
  }
});
