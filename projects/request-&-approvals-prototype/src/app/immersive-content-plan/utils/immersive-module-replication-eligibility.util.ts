import { GENERAL_SETTINGS_ID } from '../models/immersive-content-plan-editor.model';
import type { ModuleArrayDescriptor, ModuleDescriptor } from '../models/immersive-layout-descriptor.model';
import {
  getDescriptor,
  isHiddenModuleType,
  isImmersiveModuleType,
  isSupportedModuleType,
} from '../models/immersive-layout-descriptor.registry';
import type { ReplicationModuleCandidate } from '../models/immersive-module-replication.model';
import type { PlanviewLayout } from '../models/planview-layout-envelope.model';
import { extractTokens } from './immersive-layout-field.util';
import { collectEditableModules, parseEditableModuleKey } from './immersive-layout-general-settings.util';
import { hasModuleChanges } from './immersive-layout-working.util';

const NON_REPLICABLE_MODULE_TYPES: ReadonlySet<string> = new Set(['immersive-hero', 'immersive-venue']);

export function isReplicableModuleType(type: string): boolean {
  return isSupportedModuleType(type) && type !== GENERAL_SETTINGS_ID && !isHiddenModuleType(type) && !NON_REPLICABLE_MODULE_TYPES.has(type);
}

export function hasMediaRisk(descriptor: ModuleDescriptor): boolean {
  return hasFieldMediaRisk(descriptor.fields) || (descriptor.arrays ?? []).some(hasArrayMediaRisk);
}

function hasArrayMediaRisk(group: ModuleArrayDescriptor): boolean {
  return hasFieldMediaRisk(group.fields) || (group.arrays ?? []).some(hasArrayMediaRisk);
}

function hasFieldMediaRisk(fields: ModuleDescriptor['fields']): boolean {
  return Object.values(fields ?? {}).some(field => field.kind === 'url' || field.media !== undefined);
}

// A channel variant is offered next to its module, under its editable key as `id`.
export function buildReplicationCandidates(
  previousCommitted: PlanviewLayout | null,
  committed: PlanviewLayout,
  channelNames: Readonly<Record<string, string>> = {},
): ReplicationModuleCandidate[] {
  return collectEditableModules(committed).flatMap(module => {
    if (!isImmersiveModuleType(module.type) || !isReplicableModuleType(module.type)) {
      return [];
    }
    const descriptor = getDescriptor(module.type);
    if (descriptor === undefined) {
      return [];
    }
    const { channelId } = parseEditableModuleKey(module.id);
    const changed =
      previousCommitted !== null && hasModuleChanges(previousCommitted, committed, module.id, new Set(extractTokens(module.props)));
    return [
      {
        changed,
        hasMediaRisk: hasMediaRisk(descriptor),
        id: module.id,
        label: channelId === null ? descriptor.label : `${descriptor.label} · ${channelNames[channelId] ?? channelId}`,
        type: module.type,
      },
    ];
  });
}
