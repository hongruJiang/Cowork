/**
 * Close any unclosed code fence so interrupted streams don't spill content
 * as plain text. Counts fence-opening lines (3+ backticks at line start);
 * appends a closing ``` if the count is odd.
 *
 * Guards against a real user-visible bug where streaming responses with
 * code blocks could render as raw text if the stream was cancelled
 * mid-fence. Used by MarkdownRenderer before passing content to ReactMarkdown.
 *
 * Limitation: only handles backtick fences (```), not tilde fences (~~~).
 * LLMs almost never emit tilde fences, so this is an intentional simplification.
 */
export function closeOpenFences(text: string): string {
  let inFence = false;
  for (const line of text.split('\n')) {
    if (/^`{3,}/.test(line)) inFence = !inFence;
  }
  return inFence ? text + '\n```' : text;
}
