import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');
function boot(dark: boolean, cache: unknown = null, blocked = false) {
  const properties: Record<string, string> = {};
  const root = {
    dataset: {} as Record<string, string>,
    style: {
      setProperty: (key: string, value: string) => {
        properties[key] = value;
      },
    },
    classList: { toggle() {} },
    lang: '',
    dir: '',
  };
  runInNewContext(source, {
    window: { matchMedia: () => ({ matches: dark }) },
    localStorage: {
      getItem: () => {
        if (blocked) throw new Error('Blocked');
        return JSON.stringify(cache);
      },
    },
    document: { documentElement: root, querySelector: () => ({ setAttribute() {} }) },
  });
  return { root, properties };
}
describe('pre-paint theme bootstrap', () => {
  it('applies the device theme without React or saved data', () => {
    expect(boot(true).root.dataset.theme).toBe('dark');
    expect(boot(false).root.dataset.theme).toBe('light');
  });
  it('still follows the device when storage is blocked', () => {
    expect(boot(true, null, true).root.dataset.theme).toBe('dark');
  });
  it('restores a deliberate override before account loading', () => {
    const { root, properties } = boot(true, {
      settings: { theme: 'light', followDeviceTheme: false, language: 'ar' },
      resolvedTheme: 'light',
      variables: { '--primary': '#123456' },
    });
    expect(root.dataset.theme).toBe('light');
    expect(root.dir).toBe('rtl');
    expect(properties['--primary']).toBe('#123456');
  });
  it('does not restore light palette variables when a device changes to dark', () => {
    const { root, properties } = boot(true, {
      settings: { theme: 'light', followDeviceTheme: true },
      resolvedTheme: 'light',
      variables: { '--bg': '#ffffff' },
    });
    expect(root.dataset.theme).toBe('dark');
    expect(properties['--bg']).toBeUndefined();
  });
});
