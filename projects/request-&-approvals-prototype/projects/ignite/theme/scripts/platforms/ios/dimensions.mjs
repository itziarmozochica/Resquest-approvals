// Lengths, opacity, z-index and durations (in ms), as CGFloat.
// Viewport-varying tokens are emitted as a function of Viewport even when all
// three values are identical today. The alternative — a plain constant that
// silently becomes a function the day a breakpoint diverges — is a breaking
// change to every call site; the switch costs nothing now and never breaks.
import { VIEWPORT_ORDER } from '../../model/cascade.mjs';
import { swiftDoc } from '../shared/docs.mjs';
import { camel, NAMESPACE, pascal } from '../shared/names.mjs';

export const kinds = ['length', 'opacity', 'stacking', 'duration'];

export function render(tokens, { byViewport, variesByViewport, root, docs }) {
  const fixed = tokens
    .filter(token => !variesByViewport(token))
    .map(token =>
      [...swiftDoc(docs, token.path, '    '), `    public static let ${camel(token.path)}: CGFloat = ${token.value}`].join('\n'),
    );
  const scaled = tokens
    .filter(variesByViewport)
    .map(token =>
      [
        ...swiftDoc(docs, token.path, '    '),
        `    public static func ${camel(token.path)}(_ viewport: ${root}.Viewport) -> CGFloat {`,
        '        switch viewport {',
        ...VIEWPORT_ORDER.map(viewport => `        case .${viewport}: return ${byViewport[viewport].get(token.path).value}`),
        '        }',
        '    }',
      ].join('\n'),
    );
  return ['public enum Dimensions {', fixed.join('\n'), '', scaled.join('\n\n'), '}'].join('\n');
}

export function codeSyntax(token, { viewportScoped }) {
  const slot = `${pascal(NAMESPACE)}.<Brand>.Dimensions.${camel(token.path)}`;
  return viewportScoped.has(token.path) ? `${slot}(viewport)` : slot;
}
