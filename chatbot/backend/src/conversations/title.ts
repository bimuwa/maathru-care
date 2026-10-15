const TITLE_MAX_CHARS = 60;

/**
 * Side-panel title from a conversation's first user message: whitespace
 * collapsed, cut on code points (never mid-character) with an ellipsis when
 * shortened. Message text — never log the result.
 */
export function conversationTitle(firstUserMessage: string | null): string {
  const flat = (firstUserMessage ?? '').replace(/\s+/g, ' ').trim();
  if (flat.length === 0) return 'New chat';
  const chars = Array.from(flat);
  return chars.length <= TITLE_MAX_CHARS ? flat : `${chars.slice(0, TITLE_MAX_CHARS).join('').trimEnd()}…`;
}
