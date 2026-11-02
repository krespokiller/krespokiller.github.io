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
  zones: Record<'garage' | 'tribuu' | 'loopay' | 'galgo' | 'trebet' | 'dock' | 'migrated' | 'hub', DialogText>;
  locked: (missing: { districts: number; shards: number; migration: number }) => DialogText;
  hubActions: { linkedin: string; github: string; contact: string };
  names: Record<string, string>;
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
    goals: ['Visit the 5 districts of my career', 'Collect the 8 stack shards', 'Finish the AWS → Azure migration'],
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
    dock: {
      title: 'TERRAFORM YARD',
      tag: 'Boss level · AWS → Azure',
      pages: [
        'I led the AWS-to-Azure migration with the CTO, rebuilding the infrastructure in Terraform: Container Apps, PostgreSQL Flexible Server, Key Vault and managed identities.',
        'Your turn: carry 3 containers from the AWS dock (orange) to the Azure dock (blue). Dodge the patrol drones — if one catches you, the container is lost.',
      ],
    },
    migrated: {
      title: 'MIGRATION COMPLETE',
      tag: 'AWS → Azure',
      pages: ['All 3 containers landed on Azure. Infrastructure as code is what makes a move like this repeatable.'],
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
  names: { garage: 'Chía Garage', tribuu: 'Tribuu', loopay: 'Loopay Tower', galgo: 'Galgo', trebet: 'Trebet', hub: 'Settle Once HQ', aws: 'AWS dock', azure: 'Azure dock' },
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
    goals: ['Visita los 5 distritos de mi carrera', 'Recoge los 8 fragmentos de stack', 'Completa la migración AWS → Azure'],
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
    dock: {
      title: 'PATIO TERRAFORM',
      tag: 'Nivel jefe · AWS → Azure',
      pages: [
        'Lideré la migración de AWS a Azure junto con el CTO, reconstruyendo la infraestructura en Terraform: Container Apps, PostgreSQL Flexible Server, Key Vault e identidades administradas.',
        'Tu turno: lleva 3 contenedores del muelle AWS (naranja) al muelle Azure (azul). Esquiva los drones de patrulla: si uno te alcanza, pierdes el contenedor.',
      ],
    },
    migrated: {
      title: 'MIGRACIÓN COMPLETA',
      tag: 'AWS → Azure',
      pages: ['Los 3 contenedores aterrizaron en Azure. La infraestructura como código es lo que hace repetible una mudanza así.'],
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
  names: { garage: 'Garaje en Chía', tribuu: 'Tribuu', loopay: 'Torre Loopay', galgo: 'Galgo', trebet: 'Trebet', hub: 'Settle Once HQ', aws: 'Muelle AWS', azure: 'Muelle Azure' },
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
