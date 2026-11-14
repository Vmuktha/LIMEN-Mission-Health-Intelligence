import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHECKIN_STORE,
  createInMemoryStorageAdapter,
  FOLLOW_UP_STORE,
  MISSION_CONTEXT_STORE,
  MISSION_EVENT_STORE,
  MISSION_TRANSITION_STORE,
  runMultiStoreTransaction,
} from '@/lib/storage/database';
import { saveCheckIn, listCheckIns } from '@/lib/storage/checkin-storage';
import { saveAssessmentSession, listAssessmentSessions } from '@/lib/storage/assessment-storage';
import type { SymptomCheckInRecord } from '@/types/checkin';
import type { AssessmentSession } from '@/types/assessment';

// Minimal synthetic records matching existing type definitions
function dummyCheckIn(): SymptomCheckInRecord {
  return {
    id: 'ci-1',
    participantId: 'participant-1',
    recordedAt: '2026-01-01T00:00:00.000Z',
    context: 'pre-assessment',
    provenance: 'browser-user-generated',
    dizzinessOrDisorientation: 0,
    balanceOrCoordinationDifficulty: 10,
    movementConfidence: 10,
    interpretation: 'self-report-not-an-objective-vestibular-measurement',
  };
}

function dummyAssessmentSession(): AssessmentSession {
  return {
    metadata: {
      sessionId: 'as-1',
      participantId: 'participant-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:10:00.000Z',
      inputDevice: 'mouse',
      protocolVersion: '0.1.0',
      provenance: 'browser-user-generated',
      simulated: false,
    },
    status: 'completed',
    conditions: ['normal-feedback', 'clockwise-45-degree-feedback-rotation'],
    trials: [],
    phaseSummaries: [],
    adaptationSummary: null,
    baselineComparisons: [],
    neuralActivityMeasured: false,
    clinicalDiagnosticStatus: 'not-a-clinical-diagnosis',
  };
}

test('privacy deletion removes check‑ins but preserves assessment sessions', async () => {
  const adapter = createInMemoryStorageAdapter();

  // Insert records into both user‑generated and protected stores
  const saveCheckInResult = await saveCheckIn(dummyCheckIn(), adapter);
  assert.equal(saveCheckInResult.ok, true);

  const saveAssessResult = await saveAssessmentSession(dummyAssessmentSession(), adapter);
  assert.equal(saveAssessResult.ok, true);

  // Verify initial presence
  const preCheckIns = await listCheckIns(adapter);
  const preAssess = await listAssessmentSessions(adapter);
  assert.equal(preCheckIns.ok, true);
  assert.equal(preAssess.ok, true);
  if (preCheckIns.ok) assert.equal(preCheckIns.value.length, 1);
  if (preAssess.ok) assert.equal(preAssess.value.length, 1);

  // Run the privacy deletion transaction (user‑generated stores only)
  const result = await runMultiStoreTransaction(
    [CHECKIN_STORE, MISSION_CONTEXT_STORE, MISSION_EVENT_STORE, FOLLOW_UP_STORE, MISSION_TRANSITION_STORE],
    'readwrite',
    async (tx) => {
      const stores = tx.objectStoreNames;
      for (const name of stores) {
        const store = tx.objectStore(name);
        const keysReq = store.getAllKeys();
        const keys: string[] = await new Promise((res, rej) => {
          keysReq.onsuccess = () => res(keysReq.result as unknown as string[]);
          keysReq.onerror = () => rej(keysReq.error);
        });
        for (const key of keys) {
          store.delete(key);
        }
      }
    },
    adapter,
  );
  assert.equal(result.ok, true);

  // After deletion, check‑ins should be gone, assessment sessions should remain
  const postCheckIns = await listCheckIns(adapter);
  const postAssess = await listAssessmentSessions(adapter);
  assert.equal(postCheckIns.ok, true);
  if (postCheckIns.ok) assert.equal(postCheckIns.value.length, 0);
  assert.equal(postAssess.ok, true);
  if (postAssess.ok) {
    assert.equal(postAssess.value.length, 1);
    assert.equal(postAssess.value[0].metadata.sessionId, 'as-1');
  }

  // Verify expected store states directly on the adapter
  assert.deepEqual(await adapter.getAll(CHECKIN_STORE), []);
  assert.deepEqual(await adapter.getAll(MISSION_CONTEXT_STORE), []);
  assert.deepEqual(await adapter.getAll(MISSION_EVENT_STORE), []);
  assert.deepEqual(await adapter.getAll(FOLLOW_UP_STORE), []);
  assert.deepEqual(await adapter.getAll(MISSION_TRANSITION_STORE), []);
});
