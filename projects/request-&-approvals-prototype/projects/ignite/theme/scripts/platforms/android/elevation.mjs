// Android has no elevation output yet: a View or Compose elevation is one dp
// value plus shadow colours, not the layered box-shadow these tokens hold, so
// the mapping is a design decision still to make. Until then the tokens are
// reported once per brand, from its base layer, instead of silently dropped.
export const kinds = ['shadow'];

export function render(tokens, { brand, dir }) {
  if (dir === 'values') {
    console.warn(`android: ${brand}: ${tokens.length} elevation token(s) not emitted — no Android elevation mapping yet`);
  }
  return '';
}
