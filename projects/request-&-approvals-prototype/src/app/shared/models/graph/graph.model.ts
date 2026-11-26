import { GraphType } from './graph-type.enum';

export interface GraphData {
  id: string;
  name: string;
  description: string;
  url: string;
  type: GraphType;
  restriction_type: string;
  auto_refresh: number | null;
  external_id: number | null;
}

export class Graph {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public url: string,
    public type: GraphType,
    public restrictionType: string,
    public autoRefresh: number | null,
    public externalId: number | null = null,
  ) {}
}
