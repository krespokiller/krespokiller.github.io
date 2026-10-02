import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Navbar } from './Navbar';

// Forces a data-theme on <html> so both palettes can be reviewed side by
// side. Restores the stored theme when the story unmounts.
const withTheme =
  (theme: 'light' | 'dark') =>
  (Story: React.ComponentType) => {
    React.useEffect(() => {
      const previous = document.documentElement.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', theme);
      return () => {
        if (previous !== null) {
          document.documentElement.setAttribute('data-theme', previous);
        }
      };
    }, []);
    return <Story />;
  };

const meta: Meta<typeof Navbar> = {
  title: 'Organisms/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0C2604' },
        { name: 'light', value: '#F2F2F2' },
      ],
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DarkTheme: Story = {
  args: {},
  decorators: [withTheme('dark')],
};

export const LightTheme: Story = {
  args: {},
  decorators: [withTheme('light')],
};
