import type { CSSProperties } from 'react';

export const DEFAULT_COLOR = '#6754df';
export function hsvToHex(h: number, s: number, v: number) {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`;
}
export function hexToHsv(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  const h =
    d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: max === 0 ? 0 : d / max, v: max };
}
function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function appearanceVariables(color: string, theme: 'light' | 'dark') {
  const dark = theme === 'dark';
  const { h, s } = hexToHsv(color);
  // Keep text readable even when the selected color is very light or very dark.
  const ink = hsvToHex(h, Math.min(s, dark ? 0.4 : 1), dark ? 1 : 0.55);
  return {
    '--primary': color,
    '--on-primary': luminance(color) > 0.179 ? '#000000' : '#ffffff',
    '--primary-ink': ink,
    '--primary-soft': `color-mix(in srgb, ${color} ${dark ? 22 : 12}%, ${dark ? '#1a1523' : '#ffffff'})`,
    '--bg': dark ? '#100d17' : '#f7f8fc',
    '--surface': dark ? '#1a1523' : '#ffffff',
    '--surface-soft': dark ? '#241d30' : '#f4f2fc',
    '--ink': dark ? '#f3effc' : '#29263a',
    '--muted': dark ? '#b2a9c0' : '#767486',
    '--line': dark ? '#362d44' : '#e9e7f0',
  } as CSSProperties;
}

export function resolveTheme(
  settings: { theme: 'light' | 'dark'; followDeviceTheme: boolean },
  deviceDark: boolean,
): 'light' | 'dark' {
  return settings.followDeviceTheme ? (deviceDark ? 'dark' : 'light') : settings.theme;
}
