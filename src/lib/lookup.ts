/** True when the controls describe a single-material lookup: 100 % A and no filler. */
export const isSingleMaterialLookup = (pctB: number, hasFiller: boolean): boolean =>
  pctB === 0 && !hasFiller
