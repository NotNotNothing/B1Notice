const ENV_ALIAS_PAIRS = [
  ['LONGBRIDGE_APP_KEY', 'LONGPORT_APP_KEY'],
  ['LONGBRIDGE_APP_SECRET', 'LONGPORT_APP_SECRET'],
  ['LONGBRIDGE_ACCESS_TOKEN', 'LONGPORT_ACCESS_TOKEN'],
] as const;

function readPrimaryEnv(primaryKey: string, legacyKey: string): string | undefined {
  return process.env[primaryKey] || process.env[legacyKey];
}

export function syncLongbridgeEnvAliases(): void {
  for (const [primaryKey, legacyKey] of ENV_ALIAS_PAIRS) {
    const value = readPrimaryEnv(primaryKey, legacyKey);
    if (!value) continue;

    process.env[primaryKey] = value;
    process.env[legacyKey] = value;
  }
}

export function getMissingLongbridgeEnvVars(): string[] {
  syncLongbridgeEnvAliases();

  return ENV_ALIAS_PAIRS
    .filter(([primaryKey, legacyKey]) => !readPrimaryEnv(primaryKey, legacyKey))
    .map(([primaryKey]) => primaryKey);
}

export function hasLongbridgeCredentials(): boolean {
  return getMissingLongbridgeEnvVars().length === 0;
}

export function assertLongbridgeEnv(): void {
  const missing = getMissingLongbridgeEnvVars();
  if (missing.length === 0) {
    return;
  }

  throw new Error(`missing environment variable: ${missing.join(', ')}`);
}
