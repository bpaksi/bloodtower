import type { GameSimResult } from "./runner.ts";

export const formatSimReport = (results: GameSimResult[], sampleGames: number = 1): string => {
  const lines: string[] = [];
  lines.push(`games=${results.length}`);
  if (results.length === 0) return lines.join("\n");

  const totalDays = results.reduce((sum, game) => sum + game.days.length, 0);
  const totalActions = results.reduce(
    (sum, game) =>
      sum +
      game.days.reduce(
        (daySum, day) =>
          daySum + Object.values(day.groups).reduce((gSum, acts) => gSum + acts.length, 0),
        0,
      ),
    0,
  );
  lines.push(`days_logged=${totalDays}`);
  lines.push(`group_actions=${totalActions}`);

  const sample = results.slice(0, sampleGames);
  for (const game of sample) {
    lines.push(`--- seed ${game.seed} ---`);
    for (const day of game.days) {
      lines.push(`Day ${day.day}`);
      for (const [groupId, roll] of Object.entries(day.rolls)) {
        lines.push(`  ${groupId} moves=${roll}`);
      }
      for (const [groupId, acts] of Object.entries(day.groups)) {
        if (acts.length === 0) continue;
        lines.push(`  ${groupId}: ${acts.join(", ")}`);
      }
      if (day.skull) {
        lines.push(
          `  skull ${day.skull.kingdom} @ ${day.skull.spaceId}${day.skull.building ? ` (${day.skull.building})` : ""}`,
        );
      }
    }
  }
  return lines.join("\n");
};
