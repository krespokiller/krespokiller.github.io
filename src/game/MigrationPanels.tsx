import type { MigUi } from './PlayMode';
import type { MigrationText } from './text';
import { MEDALS, PROVIDERS, PROVIDER_META, SERVICES, TF_SHARDS, pieceOf } from './migration';
import type { MigrationHud, Provider, StepId } from './migration';

interface Props {
  ui: MigUi;
  text: MigrationText;
  hud: MigrationHud;
  pair: { from: Provider; to: Provider };
  onPair: (p: { from: Provider; to: Provider }) => void;
  onStart: () => void;
  onTake: (id: StepId) => void;
  onAdvance: () => void;
  onClose: () => void;
  onAgain: () => void;
  best: Record<string, string>;
}

const GRADE_COLOR: Record<string, string> = { S: '#ffd27a', A: '#b6ff3b', B: '#00f0ff', C: '#ff9fb4' };

export function MigrationPanels({ ui, text, hud, pair, onPair, onStart, onTake, onAdvance, onClose, onAgain, best }: Props) {
  const t = text;

  if (ui.kind === 'console') {
    const running = hud.phase === 'run';
    const same = pair.from === pair.to;
    const picker = (label: string, key: 'from' | 'to') => (
      <div className="pm-mig-picker">
        <span>{label}</span>
        <div>
          {PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              className={`pm-btn pm-prov${pair[key] === p ? ' on' : ''}`}
              style={{ ['--prov' as string]: PROVIDER_META[p].color }}
              onClick={() => onPair({ ...pair, [key]: p })}
              aria-pressed={pair[key] === p}
            >
              {PROVIDER_META[p].name}
            </button>
          ))}
        </div>
      </div>
    );
    const bestGrade = best[`${pair.from}>${pair.to}`];
    return (
      <div className="pm-dialog-wrap">
        <section className="pm-panel pm-dialog pm-mig-console" style={{ ['--accent' as string]: '#00f0ff' }}>
          <header>
            <h3>{t.console.title}</h3>
            <p>{t.console.tag}</p>
          </header>
          {!running && t.console.intro.map((line) => (
            <p key={line} className="pm-mig-intro">
              {line}
            </p>
          ))}
          {picker(t.console.from, 'from')}
          {picker(t.console.to, 'to')}
          <p className="pm-mig-note">
            {same ? t.console.samePair : bestGrade ? `${t.console.best}: ${bestGrade}` : ' '}
          </p>
          <footer>
            <button type="button" className="pm-btn" onClick={onClose}>
              {t.console.cancel}
            </button>
            <button type="button" className="pm-btn pm-primary" onClick={onStart} disabled={same} autoFocus>
              {running ? t.console.restart : t.console.start}
            </button>
          </footer>
        </section>
      </div>
    );
  }

  if (ui.kind === 'briefing') {
    const last = ui.page + 1 >= t.briefing.steps.length;
    return (
      <div className="pm-dialog-wrap">
        <section className="pm-panel pm-dialog" style={{ ['--accent' as string]: '#a78bfa' }} aria-live="polite">
          <header>
            <h3>{t.briefing.title}</h3>
            <p>
              {PROVIDER_META[pair.from].name} → {PROVIDER_META[pair.to].name}
            </p>
          </header>
          <p className="pm-body">{t.briefing.steps[ui.page]}</p>
          <footer>
            <span className="pm-page">
              {ui.page + 1}/{t.briefing.steps.length}
            </span>
            <button type="button" className="pm-btn pm-primary" onClick={onAdvance} autoFocus>
              {last ? t.pick.close : 'NEXT ▶'}
            </button>
          </footer>
        </section>
      </div>
    );
  }

  if (ui.kind === 'pick') {
    return (
      <div className="pm-dialog-wrap">
        <section className="pm-panel pm-dialog pm-mig-pick" style={{ ['--accent' as string]: hud.from ? PROVIDER_META[hud.from].color : '#a78bfa' }}>
          <header>
            <h3>{t.pick.title}</h3>
            <p>{t.pick.tag}</p>
          </header>
          <ul className="pm-mig-list">
            {hud.steps.map((st) => {
              const info = t.steps[st.id];
              const svc = hud.to ? SERVICES[pieceOf(st.id)][hud.to] : '';
              return (
                <li key={st.id} className={st.state}>
                  <div className="row">
                    <span className="mark">{st.state === 'done' ? '✓' : st.state === 'locked' ? '🔒' : '▢'}</span>
                    <div className="txt">
                      <b>{info.title}</b>
                      <small>{svc}</small>
                      {st.state === 'locked' && st.reason && <em>{t.locks[st.reason]}</em>}
                      {st.state === 'available' && st.warnings.length > 0 && (
                        <em className="warn">
                          {t.pick.warn} {st.warnings.map((w) => t.warnings[w].title).join(' · ')}
                        </em>
                      )}
                    </div>
                    {st.state === 'available' && (
                      <button type="button" className="pm-btn pm-primary" onClick={() => onTake(st.id)}>
                        {t.pick.take}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <footer>
            <button type="button" className="pm-btn" onClick={onClose} autoFocus>
              {t.pick.close}
            </button>
          </footer>
        </section>
      </div>
    );
  }

  if (ui.kind === 'card') {
    const d = ui.d;
    const info = t.steps[d.step];
    const piece = pieceOf(d.step);
    const to = PROVIDER_META[d.to];
    return (
      <div className="pm-dialog-wrap">
        <section className="pm-panel pm-dialog" style={{ ['--accent' as string]: to.color }} aria-live="polite">
          <header>
            <h3>{info.title}</h3>
            <p>
              {SERVICES[piece][d.from]} → <b style={{ color: to.color }}>{SERVICES[piece][d.to]}</b>
            </p>
          </header>
          <p className="pm-body">{info.lesson}</p>
          {d.warnings.length > 0 && (
            <ul className="pm-mig-warn">
              {d.warnings.map((w) => (
                <li key={w}>
                  <b>{t.warnings[w].title}</b> — {t.warnings[w].body}
                </li>
              ))}
            </ul>
          )}
          <footer>
            <button type="button" className="pm-btn pm-primary" onClick={onAdvance} autoFocus>
              {d.completed ? 'NEXT ▶' : t.pick.close}
            </button>
          </footer>
        </section>
      </div>
    );
  }

  // result
  const r = ui.r;
  const from = PROVIDER_META[r.from];
  const to = PROVIDER_META[r.to];
  return (
    <div className="pm-boot pm-mig-result">
      <section className="pm-panel pm-boot-card" style={{ ['--accent' as string]: GRADE_COLOR[r.grade] }}>
        <p className="kicker">{t.result.title}</p>
        <h1>
          <span style={{ color: from.color }}>{from.name}</span> → <span style={{ color: to.color }}>{to.name}</span>
        </h1>
        <p className="lead">
          {t.result.tag(from.name, to.name, r.seconds)} · {t.hud.tf} {r.tf}/{TF_SHARDS}
        </p>
        <div className="pm-grade" style={{ color: GRADE_COLOR[r.grade] }}>
          <small>{t.result.grade}</small>
          {r.grade}
        </div>
        <ul className="pm-medals">
          {MEDALS.map((m) => (
            <li key={m} className={r.medals[m] ? 'on' : 'off'}>
              <span>{r.medals[m] ? '★' : '☆'}</span>
              <div>
                <b>{t.medals[m].title}</b>
                <small>{t.medals[m].body}</small>
              </div>
            </li>
          ))}
        </ul>
        {r.incidents.length > 0 && (
          <div className="pm-recap">
            <b>{t.result.recap}</b>
            <ul>
              {r.incidents.map((w) => (
                <li key={w}>
                  <b>{t.warnings[w].title}</b> — {t.warnings[w].body}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="row">
          <button type="button" className="pm-btn pm-primary" onClick={onAgain} autoFocus>
            ↻ {t.result.again}
          </button>
          <button type="button" className="pm-btn" onClick={onClose}>
            {t.result.back}
          </button>
        </div>
      </section>
    </div>
  );
}
