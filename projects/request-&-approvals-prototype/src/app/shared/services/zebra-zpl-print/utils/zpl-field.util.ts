export type ZplFieldData = string | number;

export function getZplField(xPos: number, yPos: number, data: ZplFieldData, fontSize: number = 23, block: string = ''): string {
  return `${block}^FT${xPos ? xPos : ''},${yPos ? yPos : ''}^A0N,${fontSize},${fontSize - 1},^CI28^FD${data}^FS^CI27\n`;
}

export function addZplLine(
  lines: readonly string[],
  xPos: number,
  yJump: number,
  data: ZplFieldData,
  fontSize: number = 23,
  block: string = '',
): readonly string[] {
  let previousYPos = 0;
  const previousLines = lines.length;
  if (previousLines > 0) {
    const rawYPos = lines[previousLines - 1].match(/\^FT\d+,(?<y_pos>\d+)\^+/)?.groups?.y_pos ?? '';
    previousYPos = parseInt(rawYPos);
  }
  const yPos = previousYPos + yJump;
  return [...lines, getZplField(xPos, yPos, data, fontSize, block)];
}
