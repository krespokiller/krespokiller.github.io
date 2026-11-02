/**
 * All game copy, ES/EN. Lives in the lazy game chunk on purpose: the home page
 * never pays for it. Every fact here mirrors the CV / portfolio content.
 */
export type Lang = 'en' | 'es';

export interface DialogText {
  title: string;
  tag: string;
  pages: string[];
}

export interface MigrationText {
  console: { title: string; tag: string; from: string; to: string; start: string; restart: string; cancel: string; best: string; samePair: string; intro: string[] };
  briefing: { title: string; steps: string[] };
  pick: { title: string; tag: string; locked: string; done: string; take: string; close: string; warn: string };
  steps: Record<string, { title: string; lesson: string }>;
  locks: Record<string, string>;
  warnings: Record<string, { title: string; body: string }>;
  medals: Record<string, { title: string; body: string }>;
  result: { title: string; tag: (from: string, to: string, s: number) => string; grade: string; again: string; back: string; recap: string };
  hud: { lag: string; ttl: string; ttlOk: string; ttlNo: string; time: string; tf: string; pieces: string; carrying: string; none: string };
  toast: { picked: (title: string) => string; delivered: (title: string) => string; dropped: string; tf: (n: number, t: number) => string; replicaReady: string; carrying: string; goConsole: string };
}

export interface GameText {
  boot: {
    kicker: string;
    title: string;
    lead: string;
    goals: string[];
    controlsDesktop: string;
    controlsTouch: string;
    start: string;
    classic: string;
  };
  hud: {
    objectives: string;
    districts: string;
    shards: string;
    migration: string;
    hubOpen: string;
    hubLocked: string;
    exit: string;
    exitLabel: string;
    loading: string;
    actKey: string;
    actTouch: string;
    next: string;
    close: string;
    hint: string;
  };
  toast: {
    shard: (label: string) => string;
    district: (n: number, total: number) => string;
    loaded: string;
    delivered: (n: number, total: number) => string;
    hit: string;
    needContainer: string;
    carrying: string;
    allDone: string;
  };
  zones: Record<'garage' | 'tribuu' | 'loopay' | 'galgo' | 'trebet' | 'hub', DialogText>;
  locked: (missing: { districts: number; shards: number; migration: number }) => DialogText;
  hubActions: { linkedin: string; github: string; contact: string };
  names: Record<string, string>;
  migration: MigrationText;
  combat: {
    explore: string;
    enter: string;
    enterHint: string;
    leave: string;
    leaveLabel: string;
    hp: string;
    ammo: string;
    wave: string;
    kills: string;
    best: string;
    lockdown: string;
    doorsOpen: string;
    waveToast: (n: number) => string;
    ammoEmpty: string;
    ammoPickup: (n: number) => string;
    fireKey: string;
    fireTouch: string;
    controlsDesktop: string;
    controlsTouch: string;
    deadTitle: string;
    deadTag: (wave: number, kills: number) => string;
    revive: string;
    toExplore: string;
    toBoot: string;
    toProfile: string;
  };
}

const en: GameText = {
  boot: {
    kicker: 'SETTLE ONCE // OPEN-WORLD RESUME',
    title: 'David Vargas',
    lead: 'A small night city built from my career. Walk around, read the terminals and unlock the hub.',
    goals: ['Visit the 5 districts of my career', 'Collect the 8 stack shards', 'Complete one cloud migration at the Terraform Yard'],
    controlsDesktop: 'WASD / ARROWS to move · E or SPACE to act · ESC to exit',
    controlsTouch: 'Drag on the left to move · tap ACT to interact',
    start: 'EXPLORE',
    classic: 'Skip: classic resume',
  },
  hud: {
    objectives: 'OBJECTIVES',
    districts: 'DISTRICTS',
    shards: 'STACK SHARDS',
    migration: 'MIGRATION',
    hubOpen: 'CONTACT HUB OPEN → go to SETTLE ONCE',
    hubLocked: 'Complete all three to unlock the contact hub',
    exit: 'CLASSIC RESUME',
    exitLabel: 'Exit the game and go back to the classic resume',
    loading: 'LOADING CITY…',
    actKey: 'E',
    actTouch: 'ACT',
    next: 'NEXT ▶',
    close: 'CLOSE ✕',
    hint: 'Walk to a glowing door',
  },
  toast: {
    shard: (l) => `+ ${l.toUpperCase()}`,
    district: (n, t) => `DISTRICT EXPLORED ${n}/${t}`,
    loaded: 'CONTAINER LOADED → bring it to Azure',
    delivered: (n, t) => `DELIVERED ${n}/${t}`,
    hit: 'DRONE HIT — CONTAINER LOST',
    needContainer: 'Grab a container at the AWS dock first',
    carrying: 'Already carrying a container',
    allDone: 'ALL OBJECTIVES COMPLETE — contact hub unlocked',
  },
  zones: {
    garage: {
      title: 'CHÍA GARAGE',
      tag: '2019 – 2021 · Independent web developer',
      pages: [
        'Self-taught. This is where it started: e-commerce stores on WooCommerce and PrestaShop, plus a static site in HTML, CSS and JavaScript.',
        'Shipping real shops taught me the business rules of e-commerce before I ever had a job title.',
      ],
    },
    tribuu: {
      title: 'TRIBUU',
      tag: 'Nov 2021 – Jan 2023 · JavaScript Developer',
      pages: [
        'Microservices: an Angular SPA in front of modular Express / Node.js services on MongoDB.',
        'Complex integrations: Algolia indexed search and an embedded Zoom SDK video conferencing.',
        'CI/CD automation with GitHub Actions.',
      ],
    },
    loopay: {
      title: 'LOOPAY TOWER',
      tag: 'Feb 2023 – Present · JavaScript Dev → Tech Lead',
      pages: [
        '2023 — Full-stack on RedwoodJS (React + Node.js), GraphQL and Prisma, with CI/CD on GitHub Actions.',
        'Since Oct 2025 — Tech Lead. I lead a team of 5 engineers on SOBERANA, a multi-tenant cross-border treasury and payments platform for fintech companies.',
        'We closed 12 findings from a security audit: idempotency of money-moving operations, SSRF protection, API key lifecycle and encrypted secrets.',
        'CI/CD on GitHub Actions with OIDC, an ephemeral environment per pull request and 6,000+ automated tests. Deployments got 60% faster (15 → 6 minutes) on AWS.',
      ],
    },
    galgo: {
      title: 'GALGO',
      tag: 'Dec 2023 – Sep 2025 · Software Engineer',
      pages: [
        'Checkout and Risk teams: NestJS services, a backend-for-frontend layer and Next.js interfaces on event-driven microservices in AWS.',
        'Systems on the critical path of checkout and risk evaluation, with incidents handled through PagerDuty.',
        'Infrastructure, observability and pipelines with Terraform, Datadog, GitHub Actions and AWS.',
      ],
    },
    trebet: {
      title: 'TREBET',
      tag: 'Sep 2024 – Nov 2025 · Co-founder & Software Engineer',
      pages: [
        'Co-founded a startup: a digital-intercom mobile app taken from MVP to production in about a month, with a remote team of 7 across Colombia, Mexico and Venezuela.',
        'React Native, Laravel, WebRTC with a TURN server and WebSockets.',
        'When funding ran out I moved the infrastructure from AWS to DigitalOcean — database first, then the DNS cutover, with no data loss.',
      ],
    },
    hub: {
      title: 'SETTLE ONCE HQ',
      tag: 'Access granted',
      pages: [
        'Settle once: the principle behind every payment system I build. Money moves one time, exactly once.',
        'You made it all the way here. If you want to talk about a role, a project or an idea, this is where to find me:',
      ],
    },
  },
  locked: ({ districts, shards, migration }) => ({
    title: 'ACCESS DENIED',
    tag: 'The contact hub is locked',
    pages: [
      `Still missing — districts: ${districts} · stack shards: ${shards} · containers: ${migration}. Come back when all three objectives are done.`,
    ],
  }),
  hubActions: { linkedin: 'LinkedIn', github: 'GitHub', contact: 'Back to the classic resume' },
  names: { garage: 'Chía Garage', tribuu: 'Tribuu', loopay: 'Loopay Tower', galgo: 'Galgo', trebet: 'Trebet', hub: 'Settle Once HQ', src: 'Source dock', dst: 'Target dock', console: 'Migration console' },
  migration: {
    console: {
      title: 'MIGRATION CONSOLE',
      tag: 'Terraform Yard · replayable',
      from: 'FROM',
      to: 'TO',
      start: 'START MIGRATION',
      restart: 'RESTART WITH THIS PAIR',
      cancel: 'CLOSE',
      best: 'Best',
      samePair: 'Pick two different providers.',
      intro: [
        'Move a whole platform between clouds with zero downtime. Pick the crates at the source dock, carry them to the target dock, dodge the drones.',
        'The order is the game: build the target in parallel, replicate the data, then cut over. The list at the source dock tells you what is unlocked and why.',
      ],
    },
    briefing: {
      title: 'ZERO-DOWNTIME PLAYBOOK',
      steps: [
        '1 · Build the target in parallel, as code: identity first, then network, secrets, storage, observability and the CI/CD trust. The source keeps serving traffic.',
        '2 · Lower the DNS TTL early (24h → 60s). When you switch later, clients forget the old IP in a minute instead of a day.',
        '3 · Start database replication to the target and let the lag reach zero while you move the rest.',
        '4 · Cutover: promote the replica, then switch DNS. Never the other way around, or writes land on a database nobody reads any more.',
      ],
    },
    pick: { title: 'SOURCE DOCK', tag: 'Pick a crate to carry', locked: 'LOCKED', done: 'DONE', take: 'TAKE', close: 'CLOSE', warn: 'Allowed, but costs a medal:' },
    steps: {
      identity: { title: 'Identity & access', lesson: 'Everything else needs permissions to exist. Roles, managed identities or service accounts come first; with OIDC the pipeline never stores a cloud key.' },
      network: { title: 'Network & load balancer', lesson: 'A private network with subnets, security rules and a load balancer. Compute and the database need somewhere to live before they are created.' },
      secrets: { title: 'Secrets', lesson: 'Database passwords, API keys and signing keys live in a managed vault and are injected at runtime. Compute that boots without them crashes.' },
      storage: { title: 'Object storage', lesson: 'Buckets for documents and uploads. Copy the objects first, then point the new compute at the new bucket; keep the old one read-only until cutover.' },
      observability: { title: 'Observability', lesson: 'Logs, metrics and alerts on the target before traffic arrives. Cutting over blind means the first alert comes from a customer.' },
      cicd: { title: 'CI/CD trust', lesson: 'GitHub Actions authenticates to the cloud through OIDC federation: short-lived tokens, no stored credentials. On DigitalOcean you fall back to scoped tokens.' },
      dnsTtl: { title: 'Lower DNS TTL', lesson: 'Resolvers cache records for the TTL. Drop it from hours to 60 seconds well before the switch so the cutover propagates in a minute.' },
      database: { title: 'Database · start replication', lesson: 'Create the target database as a replica (logical replication / DMS-style). The source stays primary; the replica catches up while you move the rest.' },
      compute: { title: 'Compute', lesson: 'Containers deployed as code against the target network, secrets and storage. It runs idle until DNS sends traffic its way.' },
      dbPromote: { title: 'Database · promote replica', lesson: 'With lag at zero and the new compute ready: freeze writes, promote the replica to primary and point the target compute at it. Seconds of read-only, no data loss.' },
      dns: { title: 'DNS cutover', lesson: 'Switch the records to the target load balancer. With a low TTL and a promoted database, users move over within a minute without noticing.' },
    },
    locks: {
      needIdentity: 'Needs identity & access first (no permissions yet).',
      needNetwork: 'Needs the network (nowhere to place it).',
      needSecrets: 'Needs secrets (it would boot without credentials).',
      needStorage: 'Needs object storage (uploads would be lost).',
      needCompute: 'Needs compute on the target (nothing to serve traffic).',
      needReplica: 'Start database replication first.',
      lagNotZero: 'Replication lag is not zero yet. Promoting now loses the writes still in flight.',
      alreadyCutOver: 'DNS is already cut over; lowering the TTL no longer helps.',
      done: 'Done.',
    },
    warnings: {
      staleDns: { title: 'Stale DNS', body: 'TTL was never lowered: clients may keep hitting the old IP for hours. Downtime for part of your users.' },
      dnsBeforePromote: { title: 'Writes to the wrong database', body: 'Traffic moved before the replica was promoted: new writes land on the old primary and are lost. Data loss.' },
      splitBrain: { title: 'Split brain', body: 'Two primaries accepted writes at once.' },
      blindCutover: { title: 'Blind cutover', body: 'No observability on the target: you will learn about errors from customers.' },
    },
    medals: {
      zeroDowntime: { title: 'ZERO DOWNTIME', body: 'TTL lowered early and DNS switched only after the replica was promoted.' },
      noDataLoss: { title: 'NO DATA LOSS', body: 'Every write reached the database that serves traffic.' },
      noStoredCreds: { title: 'NO STORED CREDENTIALS', body: 'CI/CD authenticates via OIDC federation. Not available on DigitalOcean (scoped tokens).' },
      iac: { title: 'INFRASTRUCTURE AS CODE', body: 'All five .tf shards collected during the run.' },
      onTime: { title: 'ON TIME', body: 'Finished within the maintenance window (150 s).' },
      observed: { title: 'OBSERVED', body: 'Logs and alerts were live before traffic arrived.' },
    },
    result: {
      title: 'MIGRATION COMPLETE',
      tag: (f, t, s) => `${f} → ${t} · ${s}s`,
      grade: 'GRADE',
      again: 'MIGRATE AGAIN',
      back: 'BACK TO THE CITY',
      recap: 'What happened',
    },
    hud: { lag: 'REPLICA LAG', ttl: 'TTL', ttlOk: '60s', ttlNo: '24h', time: 'TIME', tf: '.TF', pieces: 'PIECES', carrying: 'CARRYING', none: '—' },
    toast: {
      picked: (t) => `TOOK: ${t.toUpperCase()}`,
      delivered: (t) => `DEPLOYED: ${t.toUpperCase()}`,
      dropped: 'DRONE HIT — crate returned to the source dock',
      tf: (n, t) => `+ .TF SHARD ${n}/${t}`,
      replicaReady: 'REPLICA CAUGHT UP — lag 0',
      carrying: 'Deliver the crate you carry first',
      goConsole: 'Set up the migration at the console (center of the yard)',
    },
  },
  combat: {
    explore: 'EXPLORE',
    enter: 'COMBAT',
    enterHint: 'Lock the city down and survive the waves',
    leave: 'BACK TO EXPLORE',
    leaveLabel: 'Leave combat and reopen the city',
    hp: 'HP',
    ammo: 'AMMO',
    wave: 'WAVE',
    kills: 'KILLS',
    best: 'BEST',
    lockdown: 'LOCKDOWN — doors sealed. They are coming.',
    doorsOpen: 'Doors reopened. City is calm again.',
    waveToast: (n) => `WAVE ${n}`,
    ammoEmpty: 'OUT OF AMMO — pick up drops from fallen zombies',
    ammoPickup: (n) => `+${n} AMMO`,
    fireKey: 'CLICK / SPACE',
    fireTouch: 'FIRE',
    controlsDesktop: 'Move · aim with the mouse · click, SPACE or J to shoot · C to toggle combat',
    controlsTouch: 'Drag to move · hold FIRE to shoot in the direction you walk',
    deadTitle: 'SIGNAL LOST',
    deadTag: (w, k) => `You fell on wave ${w} with ${k} kills.`,
    revive: 'REVIVE HERE',
    toExplore: 'BACK TO EXPLORE',
    toBoot: 'RESTART GAME',
    toProfile: 'BACK TO MY PROFILE',
  },
};

const es: GameText = {
  boot: {
    kicker: 'SETTLE ONCE // CV DE MUNDO ABIERTO',
    title: 'David Vargas',
    lead: 'Una pequeña ciudad nocturna hecha con mi carrera. Camina, lee las terminales y desbloquea el hub.',
    goals: ['Visita los 5 distritos de mi carrera', 'Recoge los 8 fragmentos de stack', 'Completa una migración de nube en el Patio Terraform'],
    controlsDesktop: 'WASD / FLECHAS para moverte · E o ESPACIO para actuar · ESC para salir',
    controlsTouch: 'Arrastra a la izquierda para moverte · toca ACT para interactuar',
    start: 'EXPLORAR',
    classic: 'Saltar: ver el CV clásico',
  },
  hud: {
    objectives: 'OBJETIVOS',
    districts: 'DISTRITOS',
    shards: 'FRAGMENTOS',
    migration: 'MIGRACIÓN',
    hubOpen: 'HUB DE CONTACTO ABIERTO → ve a SETTLE ONCE',
    hubLocked: 'Completa los tres para abrir el hub de contacto',
    exit: 'CV CLÁSICO',
    exitLabel: 'Salir del juego y volver al CV clásico',
    loading: 'CARGANDO CIUDAD…',
    actKey: 'E',
    actTouch: 'ACT',
    next: 'SIGUIENTE ▶',
    close: 'CERRAR ✕',
    hint: 'Camina hacia una puerta brillante',
  },
  toast: {
    shard: (l) => `+ ${l.toUpperCase()}`,
    district: (n, t) => `DISTRITO EXPLORADO ${n}/${t}`,
    loaded: 'CONTENEDOR CARGADO → llévalo a Azure',
    delivered: (n, t) => `ENTREGADO ${n}/${t}`,
    hit: 'DRON TE ALCANZÓ — CONTENEDOR PERDIDO',
    needContainer: 'Primero toma un contenedor en el muelle AWS',
    carrying: 'Ya llevas un contenedor',
    allDone: 'OBJETIVOS COMPLETOS — hub de contacto desbloqueado',
  },
  zones: {
    garage: {
      title: 'GARAJE EN CHÍA',
      tag: '2019 – 2021 · Desarrollador web independiente',
      pages: [
        'Autodidacta. Aquí empezó todo: tiendas en línea con WooCommerce y PrestaShop, y un sitio estático en HTML, CSS y JavaScript.',
        'Lanzar tiendas reales me enseñó las reglas de negocio del e-commerce antes de tener un cargo.',
      ],
    },
    tribuu: {
      title: 'TRIBUU',
      tag: 'Nov 2021 – Ene 2023 · Desarrollador JavaScript',
      pages: [
        'Microservicios: una SPA en Angular frente a servicios modulares con Express / Node.js y MongoDB.',
        'Integraciones complejas: búsqueda indexada con Algolia y videoconferencia embebida con el SDK de Zoom.',
        'Automatización CI/CD con GitHub Actions.',
      ],
    },
    loopay: {
      title: 'TORRE LOOPAY',
      tag: 'Feb 2023 – Presente · Dev JavaScript → Tech Lead',
      pages: [
        '2023 — Full-stack en RedwoodJS (React + Node.js), GraphQL y Prisma, con CI/CD en GitHub Actions.',
        'Desde oct 2025 — Tech Lead. Lidero un equipo de 5 ingenieros en SOBERANA, una plataforma multi-tenant de tesorería y pagos transfronterizos para empresas fintech.',
        'Cerramos 12 hallazgos de una auditoría de seguridad: idempotencia de operaciones que mueven dinero, protección contra SSRF, ciclo de vida de claves API y secretos cifrados.',
        'CI/CD en GitHub Actions con OIDC, un entorno efímero por pull request y más de 6.000 pruebas automatizadas. Los despliegues fueron 60% más rápidos (de 15 a 6 minutos) en AWS.',
      ],
    },
    galgo: {
      title: 'GALGO',
      tag: 'Dic 2023 – Sep 2025 · Ingeniero de Software',
      pages: [
        'Equipos de Checkout y Riesgo: servicios en NestJS, una capa backend-for-frontend e interfaces en Next.js sobre microservicios event-driven en AWS.',
        'Sistemas del camino crítico de checkout y evaluación de riesgo, con incidentes atendidos mediante PagerDuty.',
        'Infraestructura, observabilidad y pipelines con Terraform, Datadog, GitHub Actions y AWS.',
      ],
    },
    trebet: {
      title: 'TREBET',
      tag: 'Sep 2024 – Nov 2025 · Co-fundador e Ingeniero de Software',
      pages: [
        'Co-fundé una startup: una app móvil de citófono digital llevada de MVP a producción en cerca de un mes, con un equipo remoto de 7 personas en Colombia, México y Venezuela.',
        'React Native, Laravel, WebRTC con servidor TURN y WebSockets.',
        'Al agotarse la financiación migré la infraestructura de AWS a DigitalOcean: primero la base de datos, luego el cambio de DNS, sin pérdida de datos.',
      ],
    },
    hub: {
      title: 'SETTLE ONCE HQ',
      tag: 'Acceso concedido',
      pages: [
        'Settle once: el principio detrás de cada sistema de pagos que construyo. El dinero se mueve una vez, exactamente una vez.',
        'Llegaste hasta aquí. Si quieres hablar de un rol, un proyecto o una idea, aquí me encuentras:',
      ],
    },
  },
  locked: ({ districts, shards, migration }) => ({
    title: 'ACCESO DENEGADO',
    tag: 'El hub de contacto está bloqueado',
    pages: [
      `Aún falta — distritos: ${districts} · fragmentos: ${shards} · contenedores: ${migration}. Vuelve cuando los tres objetivos estén completos.`,
    ],
  }),
  hubActions: { linkedin: 'LinkedIn', github: 'GitHub', contact: 'Volver al CV clásico' },
  names: { garage: 'Garaje en Chía', tribuu: 'Tribuu', loopay: 'Torre Loopay', galgo: 'Galgo', trebet: 'Trebet', hub: 'Settle Once HQ', src: 'Muelle de origen', dst: 'Muelle destino', console: 'Consola de migración' },
  migration: {
    console: {
      title: 'CONSOLA DE MIGRACIÓN',
      tag: 'Patio Terraform · rejugable',
      from: 'DESDE',
      to: 'HACIA',
      start: 'INICIAR MIGRACIÓN',
      restart: 'REINICIAR CON ESTE PAR',
      cancel: 'CERRAR',
      best: 'Mejor',
      samePair: 'Elige dos proveedores distintos.',
      intro: [
        'Mueve una plataforma completa entre nubes sin caída. Toma las cajas en el muelle de origen, llévalas al muelle destino y esquiva los drones.',
        'El orden es el juego: construye el destino en paralelo, replica los datos y luego haz el cambio. La lista del muelle de origen te dice qué está desbloqueado y por qué.',
      ],
    },
    briefing: {
      title: 'GUÍA DE CERO CAÍDA',
      steps: [
        '1 · Construye el destino en paralelo, como código: identidad primero; luego red, secretos, almacenamiento, observabilidad y la confianza de CI/CD. El origen sigue sirviendo tráfico.',
        '2 · Baja el TTL del DNS con anticipación (24h → 60s). Cuando cambies, los clientes olvidan la IP vieja en un minuto y no en un día.',
        '3 · Inicia la replicación de la base de datos hacia el destino y deja que el retraso llegue a cero mientras mueves el resto.',
        '4 · Cambio final: promueve la réplica y luego cambia el DNS. Nunca al revés, o las escrituras caen en una base que ya nadie lee.',
      ],
    },
    pick: { title: 'MUELLE DE ORIGEN', tag: 'Elige una caja para llevar', locked: 'BLOQUEADO', done: 'LISTO', take: 'TOMAR', close: 'CERRAR', warn: 'Permitido, pero cuesta una medalla:' },
    steps: {
      identity: { title: 'Identidad y accesos', lesson: 'Todo lo demás necesita permisos para existir. Roles, identidades administradas o cuentas de servicio van primero; con OIDC el pipeline nunca guarda una llave de la nube.' },
      network: { title: 'Red y balanceador', lesson: 'Una red privada con subredes, reglas de seguridad y un balanceador. El cómputo y la base de datos necesitan dónde vivir antes de crearse.' },
      secrets: { title: 'Secretos', lesson: 'Contraseñas de base de datos, llaves de API y de firma viven en una bóveda administrada y se inyectan en tiempo de ejecución. Un cómputo que arranca sin ellas se cae.' },
      storage: { title: 'Almacenamiento de objetos', lesson: 'Buckets para documentos y cargas. Copia los objetos primero, luego apunta el nuevo cómputo al nuevo bucket; deja el viejo en solo lectura hasta el cambio.' },
      observability: { title: 'Observabilidad', lesson: 'Logs, métricas y alertas en el destino antes de que llegue tráfico. Cambiar a ciegas significa que la primera alerta la da un cliente.' },
      cicd: { title: 'Confianza de CI/CD', lesson: 'GitHub Actions se autentica en la nube con federación OIDC: tokens de corta vida, sin credenciales guardadas. En DigitalOcean toca usar tokens con alcance limitado.' },
      dnsTtl: { title: 'Bajar TTL del DNS', lesson: 'Los resolvers cachean los registros durante el TTL. Bájalo de horas a 60 segundos mucho antes del cambio para que se propague en un minuto.' },
      database: { title: 'Base de datos · iniciar réplica', lesson: 'Crea la base destino como réplica (replicación lógica o estilo DMS). El origen sigue siendo primario; la réplica se pone al día mientras mueves el resto.' },
      compute: { title: 'Cómputo', lesson: 'Contenedores desplegados como código contra la red, los secretos y el almacenamiento del destino. Corre en vacío hasta que el DNS le mande tráfico.' },
      dbPromote: { title: 'Base de datos · promover réplica', lesson: 'Con retraso en cero y el nuevo cómputo listo: congela escrituras, promueve la réplica a primaria y apunta el cómputo destino a ella. Segundos en solo lectura, sin pérdida de datos.' },
      dns: { title: 'Cambio de DNS', lesson: 'Apunta los registros al balanceador destino. Con TTL bajo y la base promovida, los usuarios pasan en un minuto sin notarlo.' },
    },
    locks: {
      needIdentity: 'Necesita identidad y accesos primero (aún no hay permisos).',
      needNetwork: 'Necesita la red (no hay dónde ponerlo).',
      needSecrets: 'Necesita los secretos (arrancaría sin credenciales).',
      needStorage: 'Necesita el almacenamiento (se perderían las cargas).',
      needCompute: 'Necesita cómputo en el destino (nada que sirva tráfico).',
      needReplica: 'Inicia primero la replicación de la base de datos.',
      lagNotZero: 'El retraso de la réplica aún no es cero. Promover ahora pierde las escrituras en vuelo.',
      alreadyCutOver: 'El DNS ya cambió; bajar el TTL ya no ayuda.',
      done: 'Listo.',
    },
    warnings: {
      staleDns: { title: 'DNS cacheado', body: 'Nunca bajaste el TTL: los clientes pueden seguir yendo a la IP vieja durante horas. Caída para parte de tus usuarios.' },
      dnsBeforePromote: { title: 'Escrituras en la base equivocada', body: 'El tráfico se movió antes de promover la réplica: las escrituras nuevas caen en la primaria vieja y se pierden. Pérdida de datos.' },
      splitBrain: { title: 'Split brain', body: 'Dos primarias aceptaron escrituras a la vez.' },
      blindCutover: { title: 'Cambio a ciegas', body: 'Sin observabilidad en el destino: te enterarás de los errores por los clientes.' },
    },
    medals: {
      zeroDowntime: { title: 'CERO CAÍDA', body: 'TTL bajado a tiempo y DNS cambiado solo después de promover la réplica.' },
      noDataLoss: { title: 'SIN PÉRDIDA DE DATOS', body: 'Cada escritura llegó a la base que sirve el tráfico.' },
      noStoredCreds: { title: 'SIN CREDENCIALES GUARDADAS', body: 'CI/CD se autentica con federación OIDC. No disponible en DigitalOcean (tokens con alcance).' },
      iac: { title: 'INFRAESTRUCTURA COMO CÓDIGO', body: 'Los cinco fragmentos .tf recogidos durante la corrida.' },
      onTime: { title: 'A TIEMPO', body: 'Terminaste dentro de la ventana de mantenimiento (150 s).' },
      observed: { title: 'OBSERVADO', body: 'Logs y alertas estaban vivos antes de que llegara tráfico.' },
    },
    result: {
      title: 'MIGRACIÓN COMPLETA',
      tag: (f, t, s) => `${f} → ${t} · ${s}s`,
      grade: 'NOTA',
      again: 'MIGRAR DE NUEVO',
      back: 'VOLVER A LA CIUDAD',
      recap: 'Qué pasó',
    },
    hud: { lag: 'RETRASO RÉPLICA', ttl: 'TTL', ttlOk: '60s', ttlNo: '24h', time: 'TIEMPO', tf: '.TF', pieces: 'PIEZAS', carrying: 'LLEVAS', none: '—' },
    toast: {
      picked: (t) => `TOMASTE: ${t.toUpperCase()}`,
      delivered: (t) => `DESPLEGADO: ${t.toUpperCase()}`,
      dropped: 'DRON TE ALCANZÓ — la caja volvió al muelle de origen',
      tf: (n, t) => `+ FRAGMENTO .TF ${n}/${t}`,
      replicaReady: 'RÉPLICA AL DÍA — retraso 0',
      carrying: 'Entrega primero la caja que llevas',
      goConsole: 'Configura la migración en la consola (centro del patio)',
    },
  },
  combat: {
    explore: 'EXPLORAR',
    enter: 'COMBATE',
    enterHint: 'Cierra la ciudad y sobrevive a las oleadas',
    leave: 'VOLVER A EXPLORAR',
    leaveLabel: 'Salir del combate y reabrir la ciudad',
    hp: 'VIDA',
    ammo: 'MUNICIÓN',
    wave: 'OLEADA',
    kills: 'BAJAS',
    best: 'MEJOR',
    lockdown: 'CIERRE TOTAL — puertas selladas. Ya vienen.',
    doorsOpen: 'Puertas abiertas. La ciudad vuelve a la calma.',
    waveToast: (n) => `OLEADA ${n}`,
    ammoEmpty: 'SIN MUNICIÓN — recoge la que sueltan los zombis',
    ammoPickup: (n) => `+${n} MUNICIÓN`,
    fireKey: 'CLIC / ESPACIO',
    fireTouch: 'FUEGO',
    controlsDesktop: 'Muévete · apunta con el mouse · clic, ESPACIO o J para disparar · C para alternar combate',
    controlsTouch: 'Arrastra para moverte · mantén FUEGO para disparar hacia donde caminas',
    deadTitle: 'SEÑAL PERDIDA',
    deadTag: (w, k) => `Caíste en la oleada ${w} con ${k} bajas.`,
    revive: 'REVIVIR AQUÍ',
    toExplore: 'VOLVER A EXPLORAR',
    toBoot: 'REINICIAR JUEGO',
    toProfile: 'VOLVER A MI PERFIL',
  },
};

export const GAME_TEXT: Record<Lang, GameText> = { en, es };
