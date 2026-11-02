import { useEffect, useRef } from 'react';
import type { SettingsText } from './text';
import { DEFAULT_SETTINGS, KEY_CHOICES } from './settings';
import type { Settings } from './settings';

interface Props {
  text: SettingsText;
  settings: Settings;
  lang: 'en' | 'es';
  onChange: (next: Settings) => void;
  onLang: (lang: 'en' | 'es') => void;
  onClose: () => void;
}

/** A row of exclusive choices rendered as toggle buttons (aria-pressed). */
function Choice<T extends string>({ label, value, options, onPick, help }: { label: string; value: T; options: { v: T; l: string }[]; onPick: (v: T) => void; help?: string }) {
  return (
    <div className="pm-set-row">
      <span className="pm-set-label">{label}</span>
      <div className="pm-set-opts" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.v} type="button" className={`pm-btn pm-set-opt${o.v === value ? ' on' : ''}`} aria-pressed={o.v === value} onClick={() => onPick(o.v)}>
            {o.l}
          </button>
        ))}
      </div>
      {help && <small className="pm-set-help">{help}</small>}
    </div>
  );
}

export function SettingsPanel({ text: t, settings: s, lang, onChange, onLang, onClose }: Props) {
  const firstRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  // Keep focus inside the panel (it is modal over the game).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !rootRef.current) return;
    const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...s, [k]: v });
  const keyOpts = KEY_CHOICES.map((k) => ({ v: k.code, l: k.label }));

  return (
    <div className="pm-dialog-wrap pm-set-wrap">
      <section ref={rootRef} className="pm-panel pm-dialog pm-set" role="dialog" aria-modal="true" aria-labelledby="pm-set-title" onKeyDown={onKeyDown}>
        <header>
          <h3 id="pm-set-title">{t.title}</h3>
        </header>
        <div className="pm-set-body">
          <h4>{t.sectionDisplay}</h4>
          <div className="pm-set-row">
            <span className="pm-set-label">{t.language}</span>
            <div className="pm-set-opts" role="group" aria-label={t.language}>
              <button ref={firstRef} type="button" className={`pm-btn pm-set-opt${lang === 'es' ? ' on' : ''}`} aria-pressed={lang === 'es'} onClick={() => onLang('es')} lang="es">
                Español
              </button>
              <button type="button" className={`pm-btn pm-set-opt${lang === 'en' ? ' on' : ''}`} aria-pressed={lang === 'en'} onClick={() => onLang('en')} lang="en">
                English
              </button>
            </div>
          </div>
          <Choice label={t.textSize} value={s.textSize} options={[{ v: 'normal', l: t.textNormal }, { v: 'large', l: t.textLarge }]} onPick={(v) => set('textSize', v)} />
          <Choice label={t.contrast} value={s.contrast ? 'on' : 'off'} options={[{ v: 'off', l: t.off }, { v: 'on', l: t.on }]} onPick={(v) => set('contrast', v === 'on')} />
          <Choice
            label={t.motion}
            value={s.motion}
            options={[{ v: 'system', l: t.motionSystem }, { v: 'on', l: t.motionOn }, { v: 'off', l: t.motionOff }]}
            onPick={(v) => set('motion', v)}
            help={t.motionHelp}
          />

          <h4>{t.sectionControls}</h4>
          <Choice label={t.actKey} value={s.actKey} options={keyOpts} onPick={(v) => set('actKey', v)} />
          <Choice label={t.fireKey} value={s.fireKey} options={keyOpts} onPick={(v) => set('fireKey', v)} />
          <Choice label={t.fireMode} value={s.fireMode} options={[{ v: 'hold', l: t.hold }, { v: 'toggle', l: t.toggle }]} onPick={(v) => set('fireMode', v)} />
          <Choice label={t.touchSize} value={s.touchSize} options={[{ v: 'normal', l: t.textNormal }, { v: 'large', l: t.textLarge }]} onPick={(v) => set('touchSize', v)} />

          <h4>{t.sectionGame}</h4>
          <Choice label={t.difficulty} value={s.difficulty} options={[{ v: 'easy', l: t.easy }, { v: 'normal', l: t.normal }, { v: 'hard', l: t.hard }]} onPick={(v) => set('difficulty', v)} />
          <Choice label={t.noTimeLimit} value={s.noTimeLimit ? 'on' : 'off'} options={[{ v: 'off', l: t.off }, { v: 'on', l: t.on }]} onPick={(v) => set('noTimeLimit', v === 'on')} help={t.noTimeLimitHelp} />
        </div>
        <footer>
          <button type="button" className="pm-btn" onClick={() => onChange({ ...DEFAULT_SETTINGS })}>
            {t.reset}
          </button>
          <button type="button" className="pm-btn pm-primary" onClick={onClose}>
            {t.close}
          </button>
        </footer>
      </section>
    </div>
  );
}
