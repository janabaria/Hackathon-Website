export const newId = () => crypto.randomUUID();
export const parseTags = (text: string) =>
  [
    ...new Set(
      text
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);
export const displayName = (name?: string) => name?.trim() || 'Your profile';
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || '＋';
export const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
export function topicColor(topic: string) {
  return [...topic].reduce((hash, char) => hash + char.charCodeAt(0), 0) % 5;
}
export async function readImage(file: File): Promise<string> {
  if (
    !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) ||
    file.size > 1024 * 1024
  ) {
    throw new Error('Choose a PNG, JPG, WebP, or GIF smaller than 1 MB.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The image could not be read. Try another file.'));
    reader.readAsDataURL(file);
  });
}
