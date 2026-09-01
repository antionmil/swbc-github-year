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

function Layer({
  cells,
  className,
  cascade = false,
}: {
  cells: number[][];
  className: string;
  cascade?: boolean;
}) {
  return (
    <div
      className={`${className} grid ${cascade ? "cascade" : ""}`}
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 2 }}
    >
      {Array.from({ length: COLS }, (_, c) => (
        <div key={c} className="grid" style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)`, gap: 2 }}>
          {Array.from({ length: ROWS }, (_, r) => (
            <div
              key={r}
              style={{
                aspectRatio: "1",
                borderRadius: 2,
                background: LEVELS[cells[r][c]],
                ...(cascade ? { animationDelay: `${c * 0.018}s` } : {}),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The hero.
 *
 * It used to show a real stranger's year with a caption explaining whose it
 * was — which meant the first thing on the page needed a footnote. The cells
 * spell a word instead, then scatter into the shape of a year: the brand and
 * the demonstration in one move, no caption, and no GitHub call on the home
 * page at all.
 */
export function HeroGrid() {
  return (
    <div className="relative w-full">
      <Layer cells={wordMap()} className="hero-word" cascade />
      <Layer cells={scatterMap()} className="hero-year absolute inset-0" />
    </div>
  );
}
