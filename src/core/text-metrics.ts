/**
 * Count the text represented by sanitized editor markup without parsing it as
 * HTML again. Attribute values and tag names are ignored; a complete entity is
 * counted as one rendered character.
 */
export function countMarkupTextCharacters(markup: string): number {
  let count = 0;
  let cursor = 0;
  let inTag = false;
  let quote = '';

  while (cursor < markup.length) {
    const character = markup[cursor];

    if (inTag) {
      if (quote) {
        if (character === quote) quote = '';
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '>') {
        inTag = false;
      }
      cursor++;
      continue;
    }

    if (character === '<') {
      inTag = true;
      cursor++;
      continue;
    }

    if (character === '&') {
      const semicolon = markup.indexOf(';', cursor + 1);
      if (semicolon > cursor + 1 && semicolon - cursor <= 32) {
        count++;
        cursor = semicolon + 1;
        continue;
      }
    }

    count++;
    cursor++;
  }

  return count;
}
