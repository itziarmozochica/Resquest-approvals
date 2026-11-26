export type AITeam = 'ai';

export type B2BTeam =
  | 'b2b'
  | 'app-whitelabels'
  | 'b2b-inventory'
  | 'b2b-onsite'
  | 'b2b-platform'
  | 'b2b-shops'
  | 'content-provider'
  | 'integrations'
  | 'italy-homologation'
  | 'loyalty-marketplaces'
  | 'partnerships'
  | 'smb';

export type B2CTeam =
  | 'b2c'
  | 'checkout'
  | 'discoverability'
  | 'experience'
  | 'media'
  | 'microsites'
  | 'post-purchase'
  | 'seo'
  | 'user-account';

export type BizOpsTeam = 'bizops' | 'finance-and-compliance' | 'operations-excellence' | 'user-operations-excellence';

export type CashlessIntegrationTeam = 'cashless-integration';

export type DataTeam =
  | 'data'
  | 'data-ai'
  | 'data-collection'
  | 'data-engineering'
  | 'data-graduate'
  | 'data-marketing'
  | 'data-platform'
  | 'data-quality-evaluation'
  | 'data-science'
  | 'data-science-contributors'
  | 'machine-learning-engineering';

export type DevOpsTeam = 'devops';

export type DistributionTeam = 'distribution' | 'b2b-resellers' | 'transactional-api';

export type NewJoinersTeam = 'new-joiners';

export type PlatformTeam =
  | 'platform'
  | 'landings-platform'
  | 'platform-client'
  | 'platform-core'
  | 'platform-devex'
  | 'platform-messaging'
  | 'platform-transactional'
  | 'platform-write-ahead-projections';

export type SecurityTeam = 'security';

export type TechSupportTeam = 'tech-support';

export type VerticalsTeam = 'verticals' | 'cinema' | 'festivals-and-nightlife' | 'game-centers' | 'museums' | 'parks';

export type FeverTeam =
  | AITeam
  | B2BTeam
  | B2CTeam
  | BizOpsTeam
  | CashlessIntegrationTeam
  | DataTeam
  | DevOpsTeam
  | DistributionTeam
  | NewJoinersTeam
  | PlatformTeam
  | SecurityTeam
  | TechSupportTeam
  | VerticalsTeam;
