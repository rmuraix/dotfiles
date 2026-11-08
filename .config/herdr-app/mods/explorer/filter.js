// Fuzzy file-name filter. Pure (no host calls).

export const MAX_HITS = 200;

// Subsequence match, scored so basename and consecutive hits rank first. null = no match.
export function fuzzy(path, query) {
  const lower = path.toLowerCase();
  const baseStart = lower.lastIndexOf("/") + 1;
  let at = 0, score = 0, previous = -2;
  for (const ch of query) {
    const i = lower.indexOf(ch, at);
    if (i < 0) return null;
    score += (i === previous + 1 ? 3 : 1) + (i >= baseStart ? 2 : 0) - (i - at) * 0.01;
    previous = i;
    at = i + 1;
  }
  return score - lower.length * 0.02;
}

// Best matches first, as rows shaped like the tree's (see tree.js `flatten`).
export function filterRows(paths, query, max = MAX_HITS) {
  const hits = [];
  for (const path of paths) {
    const score = fuzzy(path, query);
    if (score !== null) hits.push({ path, score });
  }
  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ path }) => {
      const slash = path.lastIndexOf("/");
      return { path, name: path.slice(slash + 1), parent: slash > 0 ? path.slice(0, slash) : "", dir: false, open: false, depth: 0 };
    });
}
