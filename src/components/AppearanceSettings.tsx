import { useDeviceTheme } from '../hooks/useDeviceTheme';
import { BrandMark } from './Brand';
import { useEffect, useState } from 'react';
import { BookOpen, Check, Languages, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import {
  appearanceVariables,
  resolveTheme,
  DEFAULT_COLOR,
  hexToHsv,
  hsvToHex,
} from '../lib/appearance';
import { translate, useT } from '../lib/i18n';
import { ColorPicker } from './ColorPicker';

export function AppearanceSettings() {
  const { data, commit, notify, pending } = useApp();
  const t = useT();
  const deviceDark = useDeviceTheme();
  const [draft, setDraft] = useState(data.settings);
  const [hex, setHex] = useState(data.settings.accentColor);
  const [hsv, setHsv] = useState(() => hexToHsv(data.settings.accentColor));
  useEffect(() => {
    setDraft(data.settings);
    setHex(data.settings.accentColor);
    setHsv(hexToHsv(data.settings.accentColor));
  }, [data.settings]);
  const colorValid = /^#[0-9a-f]{6}$/i.test(hex);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(data.settings) || hex !== data.settings.accentColor;
  const previewT = (text: string) => translate(text, draft.language);
  const chooseColor = (value: typeof hsv) => {
    setHsv(value);
    const color = hsvToHex(value.h, value.s, value.v);
    setHex(color);
    setDraft({ ...draft, accentColor: color });
  };
  return (
    <section className="card settings-card appearance-settings">
      <h2>
        <Palette size={21} /> {t('Appearance')}
      </h2>
      <p className="muted">{t('Choose the space you want to learn in.')}</p>
      <div className="appearance-columns">
        <div>
          <div className="theme-options">
            {(['system', 'light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                className="button secondary"
                aria-pressed={
                  theme === 'system'
                    ? draft.followDeviceTheme
                    : !draft.followDeviceTheme && draft.theme === theme
                }
                onClick={() =>
                  setDraft({
                    ...draft,
                    theme: theme === 'system' ? draft.theme : theme,
                    followDeviceTheme: theme === 'system',
                  })
                }
              >
                {theme === 'system' ? (
                  <Monitor size={18} />
                ) : theme === 'light' ? (
                  <Sun size={18} />
                ) : (
                  <Moon size={18} />
                )}
                {t(theme === 'system' ? 'Device theme' : theme === 'light' ? 'Light' : 'Dark')}
              </button>
            ))}
          </div>
          <h3>{t('Site color')}</h3>
          <ColorPicker value={hsv} onChange={chooseColor} />
          <label>
            {t('Hex color')}
            <input
              dir="ltr"
              value={hex}
              maxLength={7}
              aria-invalid={!colorValid}
              onChange={(e) => {
                const value = e.target.value;
                setHex(value);
                if (/^#[0-9a-f]{6}$/i.test(value)) {
                  setDraft({ ...draft, accentColor: value.toLowerCase() });
                  setHsv(hexToHsv(value));
                }
              }}
            />
          </label>
          {!colorValid && (
            <p className="form-error" role="alert">
              {t('Use a six-digit hex color, like #6754df.')}
            </p>
          )}
          <button
            type="button"
            className="text-button"
            onClick={() => chooseColor(hexToHsv(DEFAULT_COLOR))}
          >
            {t('Reset color')}
          </button>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={draft.roomyText}
              onChange={(e) => setDraft({ ...draft, roomyText: e.target.checked })}
            />
            {t('Roomier text spacing')}
          </label>
          <label className="language-label">
            <span>
              <Languages size={20} /> {t('Language')}
            </span>
            <select
              value={draft.language}
              onChange={(e) => setDraft({ ...draft, language: e.target.value as 'en' | 'ar' })}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          <p className="muted">
            {t(
              'Interface language changes after saving. Your content stays in its original language.',
            )}
          </p>
        </div>
        <div className="preview-column">
          <h3>{t('Preview')}</h3>
          <p className="muted">{t('Changes appear here before you save.')}</p>
          <div
            className={`appearance-preview ${draft.roomyText ? 'preview-roomy' : ''}`}
            style={appearanceVariables(draft.accentColor, resolveTheme(draft, deviceDark))}
            dir={draft.language === 'ar' ? 'rtl' : 'ltr'}
            lang={draft.language}
          >
            <div className="preview-brand">
              <BrandMark /> BTB
            </div>
            <div className="preview-nav">
              <span>{previewT('Home')}</span>
              <span>{previewT('Notebooks')}</span>
              <span>{previewT('Reels')}</span>
            </div>
            <h2>{previewT('Your next discovery')}</h2>
            <p>{previewT('A little learning, every day.')}</p>
            <article>
              <span className="preview-topic">{previewT('Science')}</span>
              <h3>{previewT('Small lessons. Real takeaways.')}</h3>
              <p>{previewT('Discover. Focus. Practice.')}</p>
              <span className="preview-study">
                <BookOpen size={16} /> {previewT('Study this')}
              </span>
            </article>
            <span className="preview-cta">{previewT('Start learning')}</span>
          </div>
        </div>
      </div>
      <div className="button-row appearance-save">
        <button
          className="button primary"
          disabled={!dirty || !colorValid || pending}
          onClick={async () => {
            if (await commit({ type: 'settings/update', settings: draft }))
              notify(translate('Changes saved.', draft.language));
          }}
        >
          <Check size={18} />
          {t(pending ? 'Saving…' : 'Save changes')}
        </button>
        <button
          className="button secondary"
          disabled={!dirty || pending}
          onClick={() => {
            setDraft(data.settings);
            setHex(data.settings.accentColor);
            setHsv(hexToHsv(data.settings.accentColor));
          }}
        >
          {t('Cancel changes')}
        </button>
      </div>
    </section>
  );
}
