import { describe, it, expect } from 'vitest';
import { closeOpenFences } from './markdownUtils';

describe('closeOpenFences', () => {
  it('returns empty string unchanged', () => {
    expect(closeOpenFences('')).toBe('');
  });

  it('returns plain text without fences unchanged', () => {
    const text = 'Hello world\n\nThis has no code blocks.';
    expect(closeOpenFences(text)).toBe(text);
  });

  it('leaves a properly closed code block alone', () => {
    const text = 'Here:\n```js\nconst x = 1;\n```\nDone.';
    expect(closeOpenFences(text)).toBe(text);
  });

  it('appends closing fence when stream cuts mid-block', () => {
    // Simulates user pressing stop while LLM was streaming a code block:
    // the closing ``` never arrived.
    const text = 'Here is some code:\n```js\nconst x = 1;\nconst y = 2;';
    expect(closeOpenFences(text)).toBe(text + '\n```');
  });

  it('handles multiple code blocks where the last is unclosed', () => {
    const text = '```ts\nconst a = 1;\n```\nMore text.\n```python\ndef foo():';
    expect(closeOpenFences(text)).toBe(text + '\n```');
  });

  it('leaves multiple closed code blocks alone', () => {
    const text = '```ts\nconst a = 1;\n```\n\n```python\ndef foo():\n    pass\n```';
    expect(closeOpenFences(text)).toBe(text);
  });

  it('recognises 4+ backtick fences', () => {
    // CommonMark allows arbitrary length fences as long as opening/closing match.
    // We treat any 3+ backtick line as a toggle, which is the simple safe behavior.
    const text = '````md\nsome ``` markdown\n````';
    expect(closeOpenFences(text)).toBe(text);
  });

  it('appends closing fence for an unclosed 4-backtick fence', () => {
    // Limitation: we only ever append three backticks. For a 4-backtick
    // opener this technically wouldn't close per CommonMark, but in practice
    // react-markdown is tolerant and end-of-input acts as fence close.
    const text = '````md\ncontent';
    expect(closeOpenFences(text)).toBe(text + '\n```');
  });

  it('ignores backticks that are not at line start', () => {
    // Inline backticks like `code` inside a paragraph should not flip the
    // fence state. Only ^`{3,}` matches.
    const text = 'Some `inline code` and ``double`` ticks.';
    expect(closeOpenFences(text)).toBe(text);
  });

  it('does not handle tilde fences (intentional limitation)', () => {
    // CommonMark also allows ~~~ as a fence. We don't handle these because
    // LLMs almost never emit them. This test documents the limitation so
    // future devs don't accidentally break the simpler backtick-only logic.
    const text = '~~~js\nconst x = 1;';
    expect(closeOpenFences(text)).toBe(text); // not modified
  });
});
