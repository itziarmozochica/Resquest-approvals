const baseGuideLinesUrl = 'https://feverpartners.zendesk.com/hc/';
const endGuideLinesUrl = '/articles/12133359072530';
export const guideLinesConfig = new Map<string, string>([
  ['UK', `${baseGuideLinesUrl}en-us${endGuideLinesUrl}`],
  ['US', `${baseGuideLinesUrl}en-us${endGuideLinesUrl}`],
  ['ES', `${baseGuideLinesUrl}es${endGuideLinesUrl}`],
  ['MX', `${baseGuideLinesUrl}es${endGuideLinesUrl}`],
  ['FR', `${baseGuideLinesUrl}fr-fr${endGuideLinesUrl}`],
  ['BE', `${baseGuideLinesUrl}fr-fr${endGuideLinesUrl}`],
  ['CH', `${baseGuideLinesUrl}fr-fr${endGuideLinesUrl}`],
  ['PT', `${baseGuideLinesUrl}pt${endGuideLinesUrl}`],
  ['BR', `${baseGuideLinesUrl}pt${endGuideLinesUrl}`],
]);
