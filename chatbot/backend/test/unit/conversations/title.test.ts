import { describe, expect, it } from 'vitest';

import { conversationTitle } from '../../../src/conversations/title.js';

describe('conversationTitle', () => {
  it('uses the first user message, whitespace collapsed', () => {
    expect(conversationTitle('  I feel\n a bit   tired ')).toBe('I feel a bit tired');
  });

  it('falls back to "New chat" when there is no user message', () => {
    expect(conversationTitle(null)).toBe('New chat');
    expect(conversationTitle('   ')).toBe('New chat');
  });

  it('cuts long titles at 60 characters with an ellipsis', () => {
    const title = conversationTitle('a'.repeat(80));
    expect(title).toBe(`${'a'.repeat(60)}…`);
  });

  it('never splits a Sinhala code point', () => {
    const sinhala = 'මට අද ටිකක් මහන්සියි '.repeat(6);
    const title = conversationTitle(sinhala);
    expect(title.endsWith('…')).toBe(true);
    expect(Array.from(title.slice(0, -1)).length).toBeLessThanOrEqual(60);
    expect(title).not.toMatch(/�/);
  });
});
