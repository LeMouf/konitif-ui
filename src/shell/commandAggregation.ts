/** A projection of existing contributions, never a registry of executors. */
export interface CommandContribution<T> {
  owner: string;
  items: readonly T[];
}

export function aggregateCommandContributions<T extends { id: string }>(
  contributions: readonly CommandContribution<T>[]
): (T & { owner: string })[] {
  const identities = new Set<string>();
  return contributions.flatMap(contribution => contribution.items.map(item => {
    // Existing UI IDs remain stable. Ambiguity is refused, not first/last-wins.
    if (identities.has(item.id)) throw new Error(`Ambiguous command contribution: ${item.id}`);
    identities.add(item.id);
    return { ...item, owner: contribution.owner };
  }));
}
