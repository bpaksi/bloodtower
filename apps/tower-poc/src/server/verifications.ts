// Verify mode (M3 step 3.6, spec D14): the results a person records of what each capability did
// on the tower, and the overlay of the newest one per capability that every client is shown.
import {
  findCapability,
  type VerificationEnvironment,
  type VerificationOverlay,
  type VerificationRecord,
  type VerifyRecordPayload,
} from "tower-poc-protocols";

export interface VerificationStorage {
  /** Saves a result and returns it with the id the database gave it. */
  add: (record: Omit<VerificationRecord, "id">) => VerificationRecord;
  /** Every saved result, oldest first, and how many rows could not be read. */
  all: () => { records: VerificationRecord[]; unusable: number };
}

export interface Verifications {
  /** The newest result per capability for the tower the service drives. */
  overlay: () => VerificationOverlay;
  /**
   * Saves a result and returns the new overlay, or the reason it was refused. Throws only when
   * the database does.
   */
  record: (
    payload: VerifyRecordPayload,
    client: string,
  ) => { ok: true; overlay: VerificationOverlay } | { ok: false; reason: string };
}

export interface VerificationsOptions {
  storage: VerificationStorage;
  tower: VerificationEnvironment["tower"];
  libraryVersion: string;
  appVersion: string;
  now?: () => number;
}

export const createVerifications = ({
  storage,
  tower,
  libraryVersion,
  appVersion,
  now = Date.now,
}: VerificationsOptions): Verifications => {
  const overlay: VerificationOverlay = {};
  const { records, unusable } = storage.all();
  if (unusable > 0) {
    console.warn(`${unusable} saved Verify result(s) could not be read and are not shown.`);
  }
  // A result from the other tower (a database shared by a mock run and a real one) is kept but
  // not shown: a pass on the mock must never read as a pass on the tower, nor hide one.
  for (const record of records) {
    if (record.environment.tower === tower) overlay[record.capabilityId] = record;
  }

  return {
    overlay: () => ({ ...overlay }),
    record: (payload, client) => {
      const capability = findCapability(payload.capabilityId);
      if (!capability || capability.uiLocation === null) {
        return {
          ok: false,
          reason: `"${payload.capabilityId}" is not a capability the app shows, so it cannot be verified.`,
        };
      }
      const saved = storage.add({
        capabilityId: capability.id,
        result: payload.result,
        notes: payload.notes.trim(),
        diagnosticSessionId: null,
        libraryVersion,
        appVersion,
        testedAt: now(),
        environment: { tower, client },
      });
      overlay[saved.capabilityId] = saved;
      return { ok: true, overlay: { ...overlay } };
    },
  };
};
