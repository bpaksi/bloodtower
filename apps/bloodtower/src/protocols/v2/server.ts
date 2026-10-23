import { z } from "zod";
import { errorMessageV2Schema, welcomeMessageV2Schema } from "./messages.ts";
import { boardViewMessageSchema, deviceViewMessageSchema } from "./views.ts";

export const serverMessageV2Schema = z.discriminatedUnion("type", [
  welcomeMessageV2Schema,
  errorMessageV2Schema,
  boardViewMessageSchema,
  deviceViewMessageSchema,
]);
export type ServerMessageV2 = z.infer<typeof serverMessageV2Schema>;

export const SERVER_MESSAGE_V2_TYPES: readonly string[] = serverMessageV2Schema.options.map(
  (option) => option.shape.type.value,
);
