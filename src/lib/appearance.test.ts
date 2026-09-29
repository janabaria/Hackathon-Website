import { describe, it, expect } from 'vitest';
import { appearanceVariables, hexToHsv, hsvToHex, resolveTheme } from './appearance';
import { createEmptyData, dataSchema } from '../domain/schema';
import { reduceData } from '../domain/actions';

describe('appearance preferences', () => {
  it('loads old account settings with safe defaults', () => {
    const legacy = { ...createEmptyData(), settings: { theme: 'dark', roomyText: true } };
    expect(dataSchema.parse(legacy).settings).toEqual({
      theme: 'dark',
      followDeviceTheme: true,
      roomyText: true,
      accentColor: '#6754df',
      language: 'en',
    });
  });
  it('persists color and Arabic alongside existing preferences', () => {
    const data = createEmptyData();
    const next = reduceData(data, {
      type: 'settings/update',
      settings: { ...data.settings, accentColor: '#11998e', language: 'ar' },
    });
    expect(dataSchema.parse(JSON.parse(JSON.stringify(next))).settings).toEqual(next.settings);
    expect(data.settings.language).toBe('en');
  });
  it('rejects malformed colors and unsupported languages', () => {
    const data = createEmptyData();
    expect(
      dataSchema.safeParse({
        ...data,
        settings: { ...data.settings, accentColor: 'url(https://bad)' },
      }).success,
    ).toBe(false);
    expect(
      dataSchema.safeParse({ ...data, settings: { ...data.settings, language: 'invalid' } })
        .success,
    ).toBe(false);
  });
  it('roundtrips colors, including hue boundaries and grayscale', () => {
    for (const color of [
      '#ff0000',
      '#00ff00',
      '#0000ff',
      '#ffffff',
      '#000000',
      '#6754df',
      '#11998e',
    ]) {
      const { h, s, v } = hexToHsv(color);
      expect(hsvToHex(h, s, v)).toBe(color);
    }
  });
  it('keeps action text readable at color extremes in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(appearanceVariables('#ffffff', theme)).toHaveProperty('--on-primary', '#000000');
      expect(appearanceVariables('#000000', theme)).toHaveProperty('--on-primary', '#ffffff');
    }
  });
});

describe('device theme', () => {
  it('uses device appearance by default and honors explicit overrides', () => {
    const settings = createEmptyData().settings;
    expect(resolveTheme(settings, true)).toBe('dark');
    expect(resolveTheme(settings, false)).toBe('light');
    expect(resolveTheme({ ...settings, followDeviceTheme: false, theme: 'light' }, true)).toBe(
      'light',
    );
    expect(resolveTheme({ ...settings, followDeviceTheme: false, theme: 'dark' }, false)).toBe(
      'dark',
    );
  });
});
