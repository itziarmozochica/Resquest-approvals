import { swiftDoc } from '../shared/docs.mjs';
import { camel } from '../shared/names.mjs';
import { swiftColor } from './colors.mjs';

export const kinds = ['shadow'];

export function render(tokens, { darkIndex, root, docs }) {
  const elevation = tokens.map(token => {
    const dark = darkIndex.get(token.path)?.value ?? token.value;
    const layers = token.value.map((layer, index) => {
      const darkColor = dark[index]?.color ?? layer.color;
      const light = swiftColor(layer.color, token.path);
      const color = darkColor === layer.color ? light : `${root}.dynamicColor(light: ${light}, dark: ${swiftColor(darkColor, token.path)})`;
      return `        ${root}.ShadowLayer(offset: CGSize(width: ${layer.offsetX}, height: ${layer.offsetY}), blur: ${layer.blur}, spread: ${layer.spread}, color: ${color})`;
    });
    return [
      ...swiftDoc(docs, token.path, '    '),
      `    public static let ${camel(token.path.replace(/^elevation\./u, ''))}: [${root}.ShadowLayer] = [`,
      layers.join(',\n'),
      '    ]',
    ].join('\n');
  });
  return ['public enum Elevation {', elevation.join('\n'), '}'].join('\n');
}
