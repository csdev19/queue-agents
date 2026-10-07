import { fullstackConvexClientEnvSchema } from "@queue-agents/infra-env";

export const env = fullstackConvexClientEnvSchema.parse(import.meta.env);
