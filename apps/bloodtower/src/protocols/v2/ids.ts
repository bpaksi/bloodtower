import { z } from "zod";

/** A prompt id or an action id. Dots stay out so a private line id cannot be a prompt. */
const SHORT_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const promptIdSchema = z.string().regex(SHORT_ID);
export const actionIdSchema = promptIdSchema;

/** Glossary id (D38). Same spelling as pack format v2. */
export const heroIdSchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);

export const deviceIdSchema = z.string().regex(SHORT_ID);

export const clientIdSchema = z.string().min(1).max(64);
