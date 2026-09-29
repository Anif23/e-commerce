/** Tiny class-name joiner (no dependency, keeps bundles small). */
export type ClassValue = string | number | null | undefined | false | ClassValue[];

export const cn = (...values: ClassValue[]): string => {
  const out: string[] = [];

  const walk = (value: ClassValue) => {
    if (!value && value !== 0) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    out.push(String(value));
  };

  values.forEach(walk);

  return out.join(' ');
};
