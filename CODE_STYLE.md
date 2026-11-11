# Code style

- Comment why, not what. `// Supercell stacks duration, not effect` helps. `// loop over items` doesn't.
- Don't wrap try/catch or null checks around values our own code already checked. Guard the edges: browser storage and pasted text.
- No function that only forwards to another function. No class where a function would do.
- No `utils.ts` or `helpers.ts`. Put a function next to what uses it, or in a file named for what it does.
- Use the game's words for names: `boostEnd`, `leftAfterBoost`, `finishAt`. Not `data`, `result2`, `processItem`.
- One component per file, around 150 lines at most. Past that, it's doing two jobs.
- `src/engine` has no React and no browser APIs. A boost rule gets a test there before anything else.
- Delete code nobody uses. Git remembers it.

# Words on the site

Write like one player talking, and use facts only the author would know.
- Say what happened and when. Don't tell people something matters.
- No "not X but Y", no "-ing" tails that just add weight, no closing line that repeats the paragraph.
- Plain words. No "seamless", "powerful", "streamline", "journey", "unlock".
- List things only when there really are that many.
- Few em dashes, little bold. A full stop works.
- Read it out loud. If it sounds like an advert, cut it.
