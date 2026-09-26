import type { ParsedQuery } from "./types.ts";
export interface Answer { title: string; text: string; href: string; store?: string }
export function answerFor(_query: string, _parsed: ParsedQuery): Answer | null {
  return null;
}
