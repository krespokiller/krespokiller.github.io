# David Santiago Vargas — Portfolio

Personal portfolio website built with React, TypeScript, Tailwind CSS, and Storybook.

## Features

- **Atomic Design**: Components organized as atoms → molecules → organisms
- **Timeline Experience**: Vertical timeline with scroll-reveal animations
- **Skills Grid**: Categorized tech stack with amber-themed badges
- **Interactive Background**: Canvas-based gravitational deformation effect
- **i18n**: English / Spanish language toggle
- **Responsive**: Mobile-first with Tailwind CSS

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS v4
- Vite
- Storybook
- react-i18next
- Yarn

## Getting Started

```shell
yarn install
yarn dev
```

## Build & Preview

```shell
yarn build
yarn preview
```

## Deployment

Push to `main` triggers GitHub Actions → builds and deploys to GitHub Pages.

## Project Structure

```
src/
├── components/
│   ├── atoms/          # Button, Heading, Input
│   ├── molecules/      # ExperienceItem
│   └── organisms/      # Header, Footer, ExperienceSection, SkillsSection, InteractiveBackground
├── const/locales/      # i18n JSON files
├── hooks/              # useLanguage, useInView
├── models/             # TypeScript interfaces
├── pages/              # Home
├── services/           # InteractiveBackground physics/render
└── styles/             # Tailwind config + global CSS
```
