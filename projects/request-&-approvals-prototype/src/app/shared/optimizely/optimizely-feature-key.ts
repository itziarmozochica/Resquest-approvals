import { FeverTeam } from '../models/fever-teams/fever-teams.model';

export interface OptimizelyFeatureKeyDef {
  readonly optimizelyFeatureKey: string;
  readonly team: FeverTeam;
}
