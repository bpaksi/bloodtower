import type { z } from "zod";

export interface PackV2Issue {
  rule: string;
  path: string;
  message: string;
}

export const packV2IssueRule = (_path: string, message: string): string => {
  const tagged = /^P2-\d+/.exec(message);
  if (tagged?.[0]) return tagged[0];
  return "P2-1";
};

export const packV2Issues = (error: z.ZodError): PackV2Issue[] =>
  error.issues.map((item) => {
    const path = item.path.map(String).join(".");
    const rule = packV2IssueRule(path, item.message);
    const message = item.message.startsWith("P2-") ? item.message : `${rule}: ${item.message}`;
    return { rule, path, message };
  });
