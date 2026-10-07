import type { ITodoRepository } from "@queue-agents/domain/repositories";
import type { CreateTodo, TodoBase } from "@queue-agents/domain/schemas";

export async function createTodo(
  repository: ITodoRepository,
  data: CreateTodo,
  userId: string,
): Promise<TodoBase> {
  return repository.create({ ...data, userId });
}
