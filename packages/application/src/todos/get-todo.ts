import type { ITodoRepository } from "@queue-agents/domain/repositories";
import type { TodoBase } from "@queue-agents/domain/schemas";

export async function getTodo(
  repository: ITodoRepository,
  id: string,
  userId: string,
): Promise<TodoBase | null> {
  return repository.findById(id, userId);
}
