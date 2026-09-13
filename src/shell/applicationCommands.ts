/** Application-owned declarations. The shell only presents and forwards them. */
export interface ApplicationCommandContribution {
  id: string;
  owner: string;
  category: string;
  title: string;
  description: string;
  disabledReason?: string;
  translationKeys?: Partial<Record<'category' | 'title' | 'description' | 'disabledReason', string>>;
  run: () => void | Promise<void>;
}

export async function invokeApplicationCommand(
  contributions: readonly ApplicationCommandContribution[], owner: string, id: string
): Promise<boolean> {
  const matches = contributions.filter(item => item.owner === owner && item.id === id);
  if (matches.length !== 1 || matches[0].disabledReason) return false;
  await matches[0].run();
  return true;
}
