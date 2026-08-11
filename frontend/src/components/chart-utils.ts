export function evenlySpacedTicks(values: readonly string[], maximum: number): string[] {
  if (values.length <= maximum) return [...values];

  return Array.from({ length: maximum }, (_, index) => {
    const position = Math.round((index * (values.length - 1)) / (maximum - 1));
    return values[position];
  });
}

export function wrapChartLabel(value: string, maximumLineLength: number): string[] {
  const words = value.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maximumLineLength || !currentLine) {
      currentLine = nextLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}
