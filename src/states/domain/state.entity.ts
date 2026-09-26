import type { StateCode } from './state-code.enum.js';

export interface StateEntity {
  id: string;
  name: string;
  code?: StateCode;
}
