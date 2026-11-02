/**
 * Terraform Yard: a replayable zero-downtime infrastructure migration.
 *
 * Pure rules (no DOM, no rendering) so they can be validated in Node. The
 * engine owns an instance; the React layer renders the console, the piece
 * list, the delivery cards and the result screen from `hud()`.
 *
 * Real-world model:
 *   1. Build the target in parallel, as code (identity → network/secrets/
 *      storage → compute), while the source keeps serving traffic.
 *   2. Lower the DNS TTL early so the final switch propagates in minutes.
 *   3. Replicate the database to the target and wait for the lag to reach 0.
 *   4. Cutover: promote the replica, then switch DNS. Never the other way
 *      around, or writes land on a database nobody reads any more.
 */

export type Provider = 'aws' | 'azure' | 'gcp' | 'do';
export const PROVIDERS: Provider[] = ['aws', 'azure', 'gcp', 'do'];

export const PROVIDER_META: Record<Provider, { name: string; color: string }> = {
  aws: { name: 'AWS', color: '#ff9900' },
  azure: { name: 'Azure', color: '#2f8bff' },
  gcp: { name: 'GCP', color: '#34a853' },
  do: { name: 'DigitalOcean', color: '#0080ff' },
};

export type PieceId = 'identity' | 'network' | 'secrets' | 'storage' | 'observability' | 'cicd' | 'database' | 'compute' | 'dns';
/** Steps = pieces plus the two-phase steps of database and DNS. */
export type StepId = PieceId | 'dnsTtl' | 'dbPromote';

/** Display / pick order (the recommended order is top to bottom). */
export const STEPS: StepId[] = ['identity', 'network', 'secrets', 'storage', 'observability', 'cicd', 'dnsTtl', 'database', 'compute', 'dbPromote', 'dns'];

/** Steps that must be done for the migration to count as complete. */
export const REQUIRED: StepId[] = ['identity', 'network', 'secrets', 'storage', 'observability', 'cicd', 'database', 'compute', 'dbPromote', 'dns'];

export const SERVICES: Record<PieceId, Record<Provider, string>> = {
  identity: { aws: 'IAM roles + OIDC provider', azure: 'Entra ID managed identities', gcp: 'IAM service accounts + Workload Identity', do: 'Teams + scoped API tokens' },
  network: { aws: 'VPC + ALB', azure: 'VNet + Application Gateway', gcp: 'VPC + Cloud Load Balancing', do: 'VPC + Load Balancer' },
  secrets: { aws: 'Secrets Manager', azure: 'Key Vault', gcp: 'Secret Manager', do: 'App-level encrypted env (no managed vault)' },
  storage: { aws: 'S3', azure: 'Blob Storage', gcp: 'Cloud Storage', do: 'Spaces' },
  observability: { aws: 'CloudWatch', azure: 'Azure Monitor + Log Analytics', gcp: 'Cloud Logging + Monitoring', do: 'DO Monitoring + external logs' },
  cicd: { aws: 'GitHub Actions → OIDC federated role', azure: 'GitHub Actions → OIDC federated identity', gcp: 'GitHub Actions → Workload Identity Federation', do: 'GitHub Actions → scoped token (no OIDC)' },
  database: { aws: 'RDS PostgreSQL', azure: 'PostgreSQL Flexible Server', gcp: 'Cloud SQL for PostgreSQL', do: 'Managed PostgreSQL' },
  compute: { aws: 'ECS Fargate', azure: 'Container Apps', gcp: 'Cloud Run', do: 'App Platform' },
  dns: { aws: 'Route 53', azure: 'Azure DNS', gcp: 'Cloud DNS', do: 'DigitalOcean DNS' },
};

export const pieceOf = (s: StepId): PieceId => (s === 'dnsTtl' ? 'dns' : s === 'dbPromote' ? 'database' : s);

export type MedalId = 'zeroDowntime' | 'noDataLoss' | 'noStoredCreds' | 'iac' | 'onTime' | 'observed';
export const MEDALS: MedalId[] = ['zeroDowntime', 'noDataLoss', 'noStoredCreds', 'iac', 'onTime', 'observed'];

export const PAR_SECONDS = 150;
export const TF_SHARDS = 5;
/** Replication catches up in this many seconds. */
export const LAG_SECONDS = 25;

export type LockReason = 'needIdentity' | 'needNetwork' | 'needSecrets' | 'needStorage' | 'needCompute' | 'needReplica' | 'lagNotZero' | 'alreadyCutOver' | 'done';
export type Warning = 'staleDns' | 'splitBrain' | 'dnsBeforePromote' | 'blindCutover';

export interface StepStatus {
  id: StepId;
  state: 'done' | 'available' | 'locked';
  reason?: LockReason;
  /** Soft problems this delivery would cause (allowed, but costs a medal). */
  warnings: Warning[];
}

export interface Delivery {
  step: StepId;
  from: Provider;
  to: Provider;
  warnings: Warning[];
  completed: boolean;
}

export interface MigrationResult {
  from: Provider;
  to: Provider;
  seconds: number;
  medals: Record<MedalId, boolean>;
  grade: 'S' | 'A' | 'B' | 'C';
  incidents: Warning[];
  tf: number;
  timed: boolean;
}

export interface MigrationHud {
  phase: 'idle' | 'run' | 'done';
  from: Provider | null;
  to: Provider | null;
  carrying: StepId | null;
  steps: StepStatus[];
  doneCount: number;
  requiredCount: number;
  /** 1 = replica just started, 0 = caught up. null = replication not started. */
  lag: number | null;
  ttlLowered: boolean;
  seconds: number;
  tf: number;
  completed: number;
}

export class Migration {
  phase: 'idle' | 'run' | 'done' = 'idle';
  from: Provider | null = null;
  to: Provider | null = null;
  carrying: StepId | null = null;
  completed = 0;
  private done = new Set<StepId>();
  private lag: number | null = null;
  private seconds = 0;
  private incidents: Warning[] = [];
  tf = 0;
  /** When true the maintenance window is disabled (XAG 116) and ON TIME is granted. */
  noTimeLimit = false;
  lastResult: MigrationResult | null = null;

  // ------------------------------------------------------------- lifecycle

  /** Starts (or restarts) a run. Returns false for an invalid pair. */
  start(from: Provider, to: Provider): boolean {
    if (from === to) return false;
    this.from = from;
    this.to = to;
    this.phase = 'run';
    this.carrying = null;
    this.done.clear();
    this.lag = null;
    this.seconds = 0;
    this.incidents = [];
    this.tf = 0;
    return true;
  }

  abort(): void {
    if (this.phase !== 'run') return;
    this.phase = 'idle';
    this.carrying = null;
  }

  update(dt: number): void {
    if (this.phase !== 'run') return;
    this.seconds += dt;
    if (this.lag !== null && this.lag > 0) this.lag = Math.max(0, this.lag - dt / LAG_SECONDS);
  }

  collectTf(): void {
    if (this.phase === 'run' && this.tf < TF_SHARDS) this.tf += 1;
  }

  // ----------------------------------------------------------------- rules

  status(step: StepId): StepStatus {
    const d = (s: StepId) => this.done.has(s);
    const warnings: Warning[] = [];
    if (d(step)) return { id: step, state: 'done', reason: 'done', warnings };
    const lock = (reason: LockReason): StepStatus => ({ id: step, state: 'locked', reason, warnings });
    switch (step) {
      case 'identity':
        break;
      case 'dnsTtl':
        if (d('dns')) return lock('alreadyCutOver');
        break;
      case 'network':
      case 'secrets':
      case 'storage':
      case 'observability':
      case 'cicd':
        if (!d('identity')) return lock('needIdentity');
        break;
      case 'database':
        if (!d('identity')) return lock('needIdentity');
        if (!d('network')) return lock('needNetwork');
        break;
      case 'compute':
        if (!d('network')) return lock('needNetwork');
        if (!d('secrets')) return lock('needSecrets');
        if (!d('storage')) return lock('needStorage');
        break;
      case 'dbPromote':
        if (!d('database')) return lock('needReplica');
        if (!d('compute')) return lock('needCompute');
        if ((this.lag ?? 1) > 0) return lock('lagNotZero');
        break;
      case 'dns':
        if (!d('compute')) return lock('needCompute');
        if (!d('dnsTtl')) warnings.push('staleDns');
        if (!d('dbPromote')) warnings.push('dnsBeforePromote');
        if (!d('observability')) warnings.push('blindCutover');
        break;
    }
    return { id: step, state: 'available', warnings };
  }

  steps(): StepStatus[] {
    return STEPS.map((s) => this.status(s));
  }

  pick(step: StepId): boolean {
    if (this.phase !== 'run' || this.carrying !== null) return false;
    if (this.status(step).state !== 'available') return false;
    this.carrying = step;
    return true;
  }

  /** Drone hit: the crate goes back to the source dock. */
  drop(): void {
    this.carrying = null;
  }

  deliver(): Delivery | null {
    if (this.phase !== 'run' || this.carrying === null || !this.from || !this.to) return null;
    const step = this.carrying;
    const st = this.status(step);
    if (st.state !== 'available') return null;
    this.carrying = null;
    this.done.add(step);
    if (step === 'database') this.lag = 1;
    for (const w of st.warnings) this.incidents.push(w);
    const completed = REQUIRED.every((s) => this.done.has(s));
    const delivery: Delivery = { step, from: this.from, to: this.to, warnings: st.warnings, completed };
    if (completed) this.finish();
    return delivery;
  }

  private finish(): void {
    if (!this.from || !this.to) return;
    const inc = new Set(this.incidents);
    const medals: Record<MedalId, boolean> = {
      zeroDowntime: !inc.has('staleDns') && !inc.has('dnsBeforePromote'),
      noDataLoss: !inc.has('dnsBeforePromote') && !inc.has('splitBrain'),
      noStoredCreds: this.to !== 'do',
      iac: this.tf >= TF_SHARDS,
      onTime: this.noTimeLimit || this.seconds <= PAR_SECONDS,
      observed: !inc.has('blindCutover'),
    };
    const n = Object.values(medals).filter(Boolean).length;
    const grade = n >= 6 ? 'S' : n >= 5 ? 'A' : n >= 3 ? 'B' : 'C';
    this.lastResult = { from: this.from, to: this.to, seconds: Math.round(this.seconds), medals, grade, incidents: [...inc], tf: this.tf, timed: !this.noTimeLimit };
    this.phase = 'done';
    this.completed += 1;
    this.carrying = null;
  }

  hud(): MigrationHud {
    return {
      phase: this.phase,
      from: this.from,
      to: this.to,
      carrying: this.carrying,
      steps: this.phase === 'run' ? this.steps() : [],
      doneCount: REQUIRED.filter((s) => this.done.has(s)).length,
      requiredCount: REQUIRED.length,
      lag: this.lag,
      ttlLowered: this.done.has('dnsTtl'),
      seconds: Math.floor(this.seconds),
      tf: this.tf,
      completed: this.completed,
    };
  }
}

export const BEST_KEY = 'settle-once-migrations';

/** Best grade per provider pair, kept in localStorage (best effort). */
export function loadBest(): Record<string, string> {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveBest(r: MigrationResult): void {
  try {
    const best = loadBest();
    const key = `${r.from}>${r.to}`;
    const rank = { S: 4, A: 3, B: 2, C: 1 } as const;
    if (!best[key] || rank[r.grade] > rank[best[key] as keyof typeof rank]) {
      best[key] = r.grade;
      localStorage.setItem(BEST_KEY, JSON.stringify(best));
    }
  } catch {
    // storage unavailable: nothing to persist
  }
}
