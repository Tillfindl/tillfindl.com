import type { ImageMetadata } from 'astro';

// Every photo in src/assets/photos, keyed by file name, so profile.ts can refer to photos by name.
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.jpg', { eager: true });

export function photo(file: string): ImageMetadata {
  const match = files[`../assets/photos/${file}`];
  if (!match) throw new Error(`Missing photo: src/assets/photos/${file}`);
  return match.default;
}
