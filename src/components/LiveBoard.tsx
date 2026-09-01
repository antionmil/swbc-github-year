"use client";

import { useEffect, useState } from "react";
import { Board } from "@/components/Board";
import type { Row } from "@/lib/leaderboard";

/**
 * The board, rendered twice.
 *
 * The server copy comes from a 30-second cache inside a page that is itself
 * cached for 30 seconds — two windows stacked, and on a quiet site
 * stale-while-revalidate means the first visitor after expiry still gets the
 * old copy. Someone who had just looked themselves up would arrive here and
 * not be on it, which is exactly the moment the list has to be right.
 *
 * So the cached rows paint immediately — fast, and present for anyone without
 * JavaScript — and a live read replaces them a moment later.
 */
export function LiveBoard({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    let alive = true;
    fetch("/api/board")
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d.rows) && d.rows.length) setRows(d.rows);
      })
      .catch(() => {
        /* keep the cached rows; a refresh failure must not empty the page */
      });
    return () => {
      alive = false;
    };
  }, []);

  return <Board rows={rows} />;
}
