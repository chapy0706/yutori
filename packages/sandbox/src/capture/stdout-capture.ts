export type StdoutCapture = {
  readonly lines: readonly string[];
  append(line: string): void;
};

export function createStdoutCapture(): StdoutCapture {
  const lines: string[] = [];
  return {
    get lines() {
      return lines as readonly string[];
    },
    append(line: string) {
      lines.push(line);
    },
  };
}
