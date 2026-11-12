import { defineConfig, type Plugin } from "vite";
import react from '@vitejs/plugin-react';
import en from './src/const/locales/en.json';
import enExperiences from './src/const/locales/experiences-en.json';
import { STACK_GROUPS } from './src/const/stack';
import type { Experience } from './src/models/experience';

// Kept in sync with ContactSection / Footer.
const GITHUB_URL = 'https://github.com/krespokiller';
const LINKEDIN_URL = 'https://www.linkedin.com/in/david-vargas-krespokiller';

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The page is rendered by React, so readers that do not run JavaScript (AI
 * assistants fetching the URL, text browsers, some crawlers) would otherwise
 * get an empty document. This injects the resume as plain semantic HTML in a
 * <noscript> block, generated from the same English locale files the app
 * renders, so the two never drift apart.
 */
function staticResume(): Plugin {
  return {
    name: 'static-resume',
    transformIndexHtml(html) {
      const experiences = enExperiences.experiences as Experience[];
      const stackLabels = en.about.stack as Record<string, string>;

      const skills = en.hero.skills.map((skill) => `<li><strong>${esc(skill.title)}.</strong> ${esc(skill.detail)}</li>`).join('');
      const roles = experiences
        .map((exp) => {
          const meta = [exp.dates, exp.location, exp.note].filter(Boolean).join(' · ');
          const links = (exp.links ?? []).map((link) => `<a href="${esc(link.href)}">${esc(link.label)}</a>`).join(' · ');
          return [
            `<h3>${esc(exp.role)} · ${esc(exp.company)}</h3>`,
            `<p>${esc(meta)}</p>`,
            exp.summary ? `<p>${esc(exp.summary)}</p>` : '',
            `<ul>${exp.description.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>`,
            exp.tags?.length ? `<p>Stack: ${esc(exp.tags.join(', '))}</p>` : '',
            links ? `<p>${links}</p>` : '',
          ].join('');
        })
        .join('');
      const bio = en.about.bio.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
      const stack = STACK_GROUPS.map((group) => {
        const label = stackLabels[group.labelKey.split('.').pop() ?? ''] ?? group.labelKey;
        return `<li><strong>${esc(label)}:</strong> ${esc(group.items.join(', '))}</li>`;
      }).join('');

      const resume = [
        '<noscript>',
        '<main style="max-width:46rem;margin:0 auto;padding:2rem 1.5rem;font-family:system-ui,sans-serif;line-height:1.6">',
        `<h1>${esc(en.hero.name)}</h1>`,
        `<p>${esc(en.hero.headline)}</p>`,
        `<p>${esc(en.hero.facts)}</p>`,
        `<ul>${skills}</ul>`,
        `<h2>${esc(en.experience.title)}</h2>`,
        roles,
        `<h2>${esc(en.about.title)}</h2>`,
        bio,
        `<h3>${esc(en.about.stackLabel)}</h3>`,
        `<ul>${stack}</ul>`,
        `<h2>${esc(en.contact.title)}</h2>`,
        `<ul><li><a href="${GITHUB_URL}">GitHub</a></li><li><a href="${LINKEDIN_URL}">LinkedIn</a></li></ul>`,
        '</main>',
        '</noscript>',
      ].join('\n      ');

      const marker = '<div id="root"></div>';
      if (!html.includes(marker)) throw new Error('static-resume: root marker not found in index.html');
      return html.replace(marker, `${marker}\n    ${resume}`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), staticResume()],
  resolve: {
    alias: {
      '@': '/src',
      '@/components': '/src/components',
      '@/pages': '/src/pages',
      '@/services': '/src/services',
      '@/const': '/src/const',
      '@/models': '/src/models',
      '@/hooks': '/src/hooks',
      '@/stories': '/src/stories',
      '@/styles': '/src/styles',
    },
  },
});
