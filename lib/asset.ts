/** Resolve only bundled public assets against the GitHub Pages project path. */
export function asset(path: string): string {
  if (!path.startsWith('/')) return path;
  return `${import.meta.env.BASE_URL}${path.slice(1)}`;
}
