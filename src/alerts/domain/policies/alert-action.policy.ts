import { StateCode } from '../../../states/domain/state-code.enum.js';

export type AlertAction = 'delegate' | 'reject' | 'manage';

/**
 * Pure domain policy: which actions a client may perform on an alert, based
 * solely on the StateCode of its current state. `undefined` (state without a
 * code yet, or unresolved) is treated the same as a terminal state: manage only.
 */
export function getAllowedActions(code?: StateCode): AlertAction[] {
  switch (code) {
    case StateCode.PENDING:
      return ['delegate', 'reject', 'manage'];
    case StateCode.IN_PROGRESS:
      return ['reject', 'manage'];
    case StateCode.RESOLVED:
    case StateCode.REJECTED:
    default:
      return ['manage'];
  }
}
