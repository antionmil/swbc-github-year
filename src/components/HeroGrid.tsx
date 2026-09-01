const F: Record<string, string[]> = {
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

const WORD = "ONE YEAR";
const COLS = 53;
const ROWS = 7;
const LEVELS = ["#16171a", "#3d3320", "#6b5522", "#a37c21", "#e8b23c"];

/** 5x7 letters, one column of space between them, centred in the 53 weeks. */
function wordMap() {
  const g = Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
  const width = WORD.length * 6 - 1;
  const off = Math.floor((COLS - width) / 2);
  [...WORD].forEach((ch, i) => {
    const glyph = F[ch] ?? F[" "];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < 5; c++)
        if (glyph[r][c] === "1") {
          const x = off + i * 6 + c;
          if (x >= 0 && x < COLS) g[r][x] = 1;
        }
  });
  return g;
}

/* A deterministic pattern, NOT anyone's data.
   It is the second half of the transition — the word scattering into the shape
   of a year — so it carries no name, no numbers and no claim. Seeded rather
   than random so the server and the browser render the same thing. */
function scatterMap() {
  let s = 5;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648), s / 2147483648);
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => {
      const v = rnd();
      return v < 0.42 ? 0 : v < 0.62 ? 1 : v < 0.8 ? 2 : v < 0.93 ? 3 : 4;
    }),
  );
}

/**
 * The hero.
 *
 * ONE layer, not two. Cross-fading a word layer over a scatter layer meant
 * that mid-transition you saw both at once, and the gold came out muddy olive
 * — that was the dullness, not the colour itself. Here every cell owns two
 * colours and animates between them, so there is never a blend of two grids:
 * a year of dots draws itself in, holds, then resolves into the words.
 */
export function HeroGrid() {
  const word = wordMap();
  const scatter = scatterMap();

  return (
    <div
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 2 }}
    >
      {Array.from({ length: COLS }, (_, c) => (
        <div key={c} className="grid" style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)`, gap: 2 }}>
          {Array.from({ length: ROWS }, (_, r) => {
            const from = LEVELS[scatter[r][c]];
            const to = word[r][c] ? LEVELS[4] : LEVELS[0];
            return (
              <div
                key={r}
                className="hero-cell"
                style={
                  {
                    aspectRatio: "1",
                    borderRadius: 2,
                    backgroundColor: from,
                    "--from": from,
                    "--to": to,
                    // Draw in left to right, then morph in the same order, so
                    // the word resolves as a sweep rather than all at once.
                    "--in": `${c * 0.016}s`,
                    "--morph": `${1.3 + c * 0.008}s`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
