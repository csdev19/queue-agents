import { fullstackServerEnvSchema } from "@queue-agents/infra-env";

export const env = fullstackServerEnvSchema.parse(process.env);
