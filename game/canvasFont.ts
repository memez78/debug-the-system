/**
 * Canvas 2D's `font` property does NOT resolve CSS custom properties the
 * way real CSS does — assigning `ctx.font = "700 36px var(--font-geist-mono)"`
 * silently fails to parse and leaves the previous font in place (browser
 * default, effectively 10px sans-serif). Every canvas text draw in this
 * game must use a concrete font stack instead of the `--font-geist-mono`
 * CSS variable the DOM overlay uses — this was why bumping the configured
 * answer-block font size never visibly changed anything.
 */
export const CANVAS_FONT_STACK = '"Courier New", Consolas, "Liberation Mono", monospace';
