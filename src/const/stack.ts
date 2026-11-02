/** Core stack groups (labels are i18n keys). Shared by the About section and the game's Stack Plaza. */
export const STACK_GROUPS: { labelKey: string; items: string[] }[] = [
  {
    labelKey: 'about.stack.languages',
    items: ['TypeScript', 'Python', 'JavaScript', 'PHP'],
  },
  {
    labelKey: 'about.stack.backend',
    items: ['NestJS', 'Django', 'FastAPI', 'Node.js', 'Laravel', 'GraphQL', 'RedwoodJS', 'WebSockets', 'WebRTC'],
  },
  {
    labelKey: 'about.stack.frontend',
    items: ['React', 'Angular', 'React Native'],
  },
  {
    labelKey: 'about.stack.databases',
    items: ['PostgreSQL', 'Aurora', 'MongoDB', 'Redis', 'Prisma', 'SQLAlchemy'],
  },
  {
    labelKey: 'about.stack.cloudDevops',
    items: ['Azure', 'AWS', 'Terraform', 'DigitalOcean', 'Docker', 'GitHub Actions', 'Datadog'],
  },
  {
    labelKey: 'about.stack.architecture',
    items: ['Multi-tenant', 'Event-driven', 'Clean Architecture', 'CI/CD', 'IaC'],
  },
  {
    labelKey: 'about.stack.testing',
    items: ['Jest', 'pytest', 'Pydantic', 'Automated Testing', 'Code Reviews'],
  },
  {
    labelKey: 'about.stack.aiOcr',
    items: ['Google Gemini', 'OCR'],
  },
];
