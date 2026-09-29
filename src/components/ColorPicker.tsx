import type { PointerEvent } from 'react';
import { hsvToHex } from '../lib/appearance';
import { useT } from '../lib/i18n';
type HSV = { h: number; s: number; v: number };
export function ColorPicker({ value, onChange }: { value: HSV; onChange: (value: HSV) => void }) {
  const t = useT();
  const update = (event: PointerEvent<HTMLDivElement>, wheel: boolean) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (wheel) {
      const x = event.clientX - box.left - box.width / 2;
      const y = event.clientY - box.top - box.height / 2;
      onChange({ ...value, h: ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360 });
    } else
      onChange({
        ...value,
        s: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
        v: 1 - Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
      });
  };
  const pointerProps = (wheel: boolean) => ({
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      update(e, wheel);
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e, wheel);
    },
  });
  return (
    <div className="color-picker" dir="ltr">
      <div className="hue-wheel" {...pointerProps(true)} aria-hidden="true">
        <span
          className="hue-marker"
          style={{
            left: `${50 + 44 * Math.sin((value.h * Math.PI) / 180)}%`,
            top: `${50 - 44 * Math.cos((value.h * Math.PI) / 180)}%`,
            background: hsvToHex(value.h, 1, 1),
          }}
        />
        <div
          className="color-square"
          style={{ backgroundColor: hsvToHex(value.h, 1, 1) }}
          {...pointerProps(false)}
        >
          <span
            style={{
              left: `${value.s * 100}%`,
              top: `${(1 - value.v) * 100}%`,
              background: hsvToHex(value.h, value.s, value.v),
            }}
          />
        </div>
      </div>
      <div className="color-sliders">
        {(['h', 's', 'v'] as const).map((key) => (
          <label key={key}>
            {t(key === 'h' ? 'Hue' : key === 's' ? 'Saturation' : 'Brightness')}
            <input
              type="range"
              min="0"
              max={key === 'h' ? 359 : 100}
              value={key === 'h' ? value.h : value[key] * 100}
              onChange={(e) =>
                onChange({ ...value, [key]: Number(e.target.value) / (key === 'h' ? 1 : 100) })
              }
            />
          </label>
        ))}
      </div>
    </div>
  );
}
