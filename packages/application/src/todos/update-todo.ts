import type { ITodoRepository } from "@queue-agents/domain/repositories";
import type { UpdateTodo, TodoBase } from "@queue-agents/domain/schemas";

export async function updateTodo(
  repository: ITodoRepository,
  id: string,
  userId: string,
  data: UpdateTodo,
): Promise<TodoBase | null> {
  return repository.update(id, userId, data);
}
