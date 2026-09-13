/** One-entry cache for immutable inputs. Owned by one mounted host, never global. */
export function createReferenceProjection<T>() {
  let previous: readonly unknown[] | undefined;
  let value: T;
  return (inputs: readonly unknown[], project: () => T): T => {
    if (!previous || inputs.length !== previous.length || inputs.some((input, index) => !Object.is(input, previous![index]))) {
      const next = project();
      previous = [...inputs];
      value = next;
    }
    return value;
  };
}
