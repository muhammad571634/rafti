import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Moment, ScheduleItem } from '@/types';

import { withoutCrisisPlanMoments, withoutCrisisPlans } from './crisis-guard';

const plan = (id: string, title: string): ScheduleItem => ({
  id,
  characterId: 'c_theo',
  title,
  date: '2026-10-14',
  createdAt: '2026-10-13T10:00:00.000Z',
  reminded: false,
  source: 'chat',
});

const moment = (id: string, kind: Moment['kind'], params?: Moment['params']): Moment => ({
  id,
  characterId: 'c_theo',
  kind,
  createdAt: '2026-10-13T10:00:00.000Z',
  ...(params ? { params } : {}),
});

describe('saved plans on load', () => {
  it('drops a plan made from "I\'m going to kill myself tomorrow" and keeps real plans', () => {
    const saved = [plan('sch_1', 'Oral exam'), plan('sch_2', 'Kill myself'), plan('sch_3', 'Dinner with mom')];
    assert.deepEqual(withoutCrisisPlans(saved).map((p) => p.id), ['sch_1', 'sch_3']);
  });

  it('keeps plans that only sound sad', () => {
    const saved = [plan('sch_1', 'Funeral'), plan('sch_2', 'Therapy session'), plan('sch_3', 'Hard talk with dad')];
    assert.equal(withoutCrisisPlans(saved).length, 3);
  });
});

describe('saved moments on load', () => {
  it('drops only crisis "plan" moments', () => {
    const saved = [
      moment('mo_1', 'plan', { title: 'Kill myself' }),
      moment('mo_2', 'plan', { title: 'Oral exam' }),
      moment('mo_3', 'board'),
      moment('mo_4', 'levelUp', { level: 5 }),
    ];
    assert.deepEqual(withoutCrisisPlanMoments(saved).map((m) => m.id), ['mo_2', 'mo_3', 'mo_4']);
  });
});
