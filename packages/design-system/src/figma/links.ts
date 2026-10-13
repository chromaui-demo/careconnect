import type { Config } from '@storybook/addon-designs';
import links from './links.json';

/**
 * Resolves the `parameters.design` value for a story title so Storybook's
 * Design tab shows the matching Figma component next to the live story.
 *
 * Resolution order:
 *  1. The component's own node URL from links.json → embedded Figma frame.
 *  2. No node URL but a library file URL → a plain link to the library file.
 *  3. Nothing configured → `undefined` (the tab shows "No designs found").
 *
 * Titles must match the story `title` exactly; they are also the names the
 * story.to.design plugin uses when it generates the Figma components, which is
 * what keeps the two directions of the bridge pointing at the same thing.
 */
export function figmaDesign(title: string): Config | undefined {
  const url = (links.components as Record<string, string>)[title];
  if (url) {
    return { type: 'figma', name: title, url };
  }
  if (links.file) {
    return {
      type: 'link',
      name: 'Figma library',
      url: links.file,
      label: `Open the CareConnect library in Figma (no frame linked yet for ${title})`,
    };
  }
  return undefined;
}
