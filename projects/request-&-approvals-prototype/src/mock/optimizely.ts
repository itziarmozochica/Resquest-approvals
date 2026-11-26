import { FeatureFlags } from '../app/shared/optimizely/feature-flags';

/** Builds an Optimizely datafile where every given flag is ON for every partner. */
export function buildDatafile(partnerId: number, flags: string[]): Record<string, unknown> {
  const pad = (n: number): string => n.toString().padStart(11, '0');
  const featureFlags: unknown[] = [];
  const rollouts: unknown[] = [];
  const audiences: unknown[] = [];
  flags.forEach((key, index) => {
    const base = index * 3;
    const [featureId, rolloutId, audienceId] = [base + 1, base + 2, base + 3].map(pad);
    featureFlags.push({ id: featureId, key, experimentIds: [], rolloutId, variables: [], variableKeyMap: {} });
    audiences.push({
      id: audienceId,
      name: key.toUpperCase(),
      conditions: `["and", ["or", ["or", {"match": "exact", "name": "partner_id", "type": "custom_attribute", "value": "${partnerId}"}]]]`,
    });
    rollouts.push({
      id: rolloutId,
      experiments: [
        {
          id: `${rolloutId}1`,
          key: `${rolloutId}1`,
          status: 'Running',
          layerId: rolloutId,
          forcedVariations: {},
          audienceIds: [audienceId],
          audienceConditions: ['or', audienceId],
          trafficAllocation: [{ entityId: `${rolloutId}2`, endOfRange: 10000 }],
          variations: [{ id: `${rolloutId}2`, key: `${rolloutId}2`, featureEnabled: true, variables: [], variablesMap: {} }],
          variationKeyMap: {},
        },
        {
          id: `${rolloutId}3`,
          key: `${rolloutId}3`,
          status: 'Running',
          layerId: rolloutId,
          forcedVariations: {},
          audienceIds: [],
          audienceConditions: [],
          trafficAllocation: [{ entityId: `${rolloutId}4`, endOfRange: 10000 }],
          variations: [{ id: `${rolloutId}4`, key: `${rolloutId}4`, featureEnabled: true, variables: [], variablesMap: {} }],
          variationKeyMap: {},
        },
      ],
    });
  });
  return {
    version: '4',
    revision: '1',
    projectId: '20303692234',
    accountId: '16850837403',
    sdkKey: 'OPTIMIZELY_SDK_KEY_PLACEHOLDER',
    environmentKey: 'development',
    anonymizeIP: true,
    botFiltering: false,
    events: [],
    groups: [],
    experiments: [],
    typedAudiences: [],
    variables: [],
    rollouts,
    featureFlags,
    audiences,
    attributes: [
      { id: '20325101996', key: 'userAllowed' },
      { id: '20325700750', key: 'partner_id' },
      { id: '20517651744', key: 'enabled_module' },
      { id: '21719141079', key: 'user_id' },
    ],
  };
}

export const allFlagKeys = (): string[] => Object.values(FeatureFlags) as string[];
