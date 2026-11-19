import { RECAP_5A3 } from './recap-5a3';
import { RECAP_5A4 } from './recap-5a4';
import { RECAP_5A6 } from './recap-5a6';
import type { CellDefinition, RecapColumn, RecapContext, RecapFormCode, RecapRowDef } from './types';

export * from './types';
export * from './cell-key';
export { RECAP_5A3, RECAP_5A4, RECAP_5A6 };

export interface RecapSpec {
  formCode: RecapFormCode;
  columns(ctx: RecapContext): RecapColumn[];
  rows(ctx: RecapContext): RecapRowDef[];
  cell(rowKey: string, colKey: string, ctx: RecapContext): CellDefinition | null;
}

export const RECAP_SPECS: Record<RecapFormCode, RecapSpec> = {
  '5.A.3': RECAP_5A3,
  '5.A.4': RECAP_5A4,
  '5.A.6': RECAP_5A6,
};
