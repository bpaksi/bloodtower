// Keeps Verify mode's results in the database (spec D14). Rows are only added, never changed.
import { asc } from "drizzle-orm";
import {
  type VerificationRecord,
  verificationEnvironmentSchema,
  verificationRecordSchema,
} from "tower-poc-protocols";
import type { VerificationStorage } from "../verifications.ts";
import type { Db } from "./client.ts";
import { verifications } from "./schema.ts";

const parseEnvironment = (json: string) => {
  try {
    return verificationEnvironmentSchema.safeParse(JSON.parse(json)).data;
  } catch {
    return undefined;
  }
};

export const createVerificationStorage = (db: Db): VerificationStorage => ({
  add: ({ environment, ...record }) => {
    const row = db
      .insert(verifications)
      .values({ ...record, environment: JSON.stringify(environment) })
      .returning({ id: verifications.id })
      .get();
    return { id: row.id, ...record, environment };
  },
  all: () => {
    const usable: VerificationRecord[] = [];
    let unusable = 0;
    for (const row of db.select().from(verifications).orderBy(asc(verifications.id)).all()) {
      const parsed = verificationRecordSchema.safeParse({
        ...row,
        environment: parseEnvironment(row.environment),
      });
      if (parsed.success) usable.push(parsed.data);
      else unusable += 1;
    }
    return { records: usable, unusable };
  },
});
