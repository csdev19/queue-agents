import type { ITodoRepository } from "@queue-agents/domain/repositories";

export async function deleteTodo(
  repository: ITodoRepository,
  id: string,
  userId: string,
): Promise<boolean> {
  return repository.delete(id, userId);
}
