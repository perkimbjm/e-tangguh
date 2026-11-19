import { FORM_5A1 } from './form-5a1';
import { FORM_5A2 } from './form-5a2';
import type { FormCode, FormDefinition } from './types';

export * from './types';
export { FORM_5A1, FORM_5A2 };

export const FORM_DEFINITIONS: Partial<Record<FormCode, FormDefinition>> = {
  '5.A.1': FORM_5A1,
  '5.A.2': FORM_5A2,
};

export function getFormDefinition(code: string): FormDefinition | undefined {
  return FORM_DEFINITIONS[code as FormCode];
}
