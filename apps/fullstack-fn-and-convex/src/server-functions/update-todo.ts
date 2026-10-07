import { createServerFn } from "@tanstack/react-start";
import type { ApiResponse } from "@queue-agents/domain/types";
import type { TodoBase, UpdateTodo } from "@queue-agents/domain/schemas";
import { updateTodoSchema } from "@queue-agents/domain/schemas";
import { createDatabaseClient } from "@queue-agents/infra-db/client";
import { TodoRepository } from "@queue-agents/infra-db/repositories";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import { env } from "@/env/server";
import z from "zod";

const updateTodoInputSchema = z.object({
  id: z.string(),
  data: updateTodoSchema,
});

export const updateTodo = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; data: UpdateTodo }) => updateTodoInputSchema.parse(input))
  .handler(async (ctx): Promise<ApiResponse<TodoBase>> => {
    const session = await getAuthSession();

    if (!session) {
      return { data: null, error: { message: "Unauthorized" } };
    }

    const db = createDatabaseClient(env.DATABASE_URL);
    const repo = new TodoRepository(db);
    const todo = await repo.update(ctx.data.id, session.user.id, ctx.data.data);

    if (!todo) {
      return { data: null, error: { message: "Todo not found" } };
    }

    return { data: todo, error: null };
  });
