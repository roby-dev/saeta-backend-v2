import { describe, expect, it } from 'vitest';
import { StateCode } from '../../../states/domain/state-code.enum.js';
import { getAllowedActions } from './alert-action.policy.js';

describe('getAllowedActions', () => {
  it('allows delegate, reject and manage when the alert is PENDING', () => {
    expect(getAllowedActions(StateCode.PENDING)).toEqual(['delegate', 'reject', 'manage']);
  });

  it('allows only reject and manage when the alert is IN_PROGRESS', () => {
    expect(getAllowedActions(StateCode.IN_PROGRESS)).toEqual(['reject', 'manage']);
  });

  it('allows only manage when the alert is RESOLVED', () => {
    expect(getAllowedActions(StateCode.RESOLVED)).toEqual(['manage']);
  });

  it('allows only manage when the alert is REJECTED', () => {
    expect(getAllowedActions(StateCode.REJECTED)).toEqual(['manage']);
  });

  it('allows only manage when the state code is unknown/undefined', () => {
    expect(getAllowedActions(undefined)).toEqual(['manage']);
  });
});
