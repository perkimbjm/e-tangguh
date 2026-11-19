import { FORM_5A1 } from './form-5a1';
import { FORM_5A2 } from './form-5a2';
import { buildForm5A3 } from './form-5a3';
import { FORM_5A4 } from './form-5a4';
import { FORM_5A5 } from './form-5a5';
import { FORM_5A9 } from './form-5a9';
import { FORM_5A10 } from './form-5a10';
import { FORM_5A11 } from './form-5a11';
import { FORM_5A12 } from './form-5a12';
import { FORM_5A6 } from './form-5a6';
import type { FormCode, FormDefinition } from './types';

export * from './types';
export { FORM_5A1, FORM_5A2, FORM_5A4, FORM_5A5, FORM_5A9, FORM_5A10, FORM_5A11, FORM_5A12, FORM_5A6, buildForm5A3 };

export const FORM_DEFINITIONS: Partial<Record<FormCode, FormDefinition>> = {
  '5.A.1': FORM_5A1,
  '5.A.2': FORM_5A2,
  '5.A.3': buildForm5A3([0]),
  '5.A.4': FORM_5A4,
  '5.A.5': FORM_5A5,
  '5.A.6': FORM_5A6,
  '5.A.9': FORM_5A9,
  '5.A.10': FORM_5A10,
  '5.A.11': FORM_5A11,
  '5.A.12': FORM_5A12,
};

export function getFormDefinition(code: string): FormDefinition | undefined {
  return FORM_DEFINITIONS[code as FormCode];
}
export * from './report-layout';
