import { createServerFn } from "@tanstack/react-start";
import type { ApiResponse } from "@queue-agents/domain/types";
import type { TodoBase } from "@queue-agents/domain/schemas";
import { createTodoSchema } from "@queue-agents/domain/schemas";
import { createDatabaseClient } from "@queue-agents/infra-db/client";
import { TodoRepository } from "@queue-agents/infra-db/repositories";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import { env } from "@/env/server";

export const createTodo = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string; categoryId?: string | null }) =>
    createTodoSchema.parse(input),
  )
  .handler(async (ctx): Promise<ApiResponse<TodoBase>> => {
    const session = await getAuthSession();

    if (!session) {
      return { data: null, error: { message: "Unauthorized" } };
    }

    const db = createDatabaseClient(env.DATABASE_URL);
    const repo = new TodoRepository(db);
    const todo = await repo.create({
      title: ctx.data.title,
      categoryId: ctx.data.categoryId ?? null,
      userId: session.user.id,
    });

    return { data: todo, error: null };
  });
