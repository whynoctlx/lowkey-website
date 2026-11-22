/** Home's line where the date was: a dry joke, the same all day (seeded by the local date), so a restart doesn't
 *  reshuffle it. Every third day it names something from the feed; others lean on the hour and weekday when they can. */
export type Quips = {
  any: string[];
  named: ((name: string) => string)[];
  late: string[];
  morning: string[];
  monday: string[];
  friday: string[];
  weekend: string[];
};

export function quip(q: Quips, now: Date, names: string[]): string {
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 6e4) / 864e5);
  const h = now.getHours();
  const w = now.getDay();
  const pick = <T>(a: T[], salt: number) => a[(day * 7919 + salt * 104729) % a.length];
  const special = [...(h < 5 ? q.late : h < 10 ? q.morning : []), ...(w === 1 ? q.monday : w === 5 ? q.friday : w % 6 === 0 ? q.weekend : [])];
  if (day % 3 === 0 && names.length) return pick(q.named, 1)(pick(names, 2));
  if (day % 3 === 1 && special.length) return pick(special, 3);
  return pick(q.any, 0);
}
