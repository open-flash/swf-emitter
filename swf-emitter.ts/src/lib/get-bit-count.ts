export function getBitCount(...values: number[]): number {
  return values
    .map(x => 32 - Math.clz32(x))
    .reduce(Math.max as (a: number, b: number) => number, 0);
}
