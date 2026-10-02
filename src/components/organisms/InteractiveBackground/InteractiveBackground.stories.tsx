import type { Meta, StoryObj } from '@storybook/react';
import { InteractiveBackground } from './InteractiveBackground';

const meta: Meta<typeof InteractiveBackground> = {
  title: 'Organisms/InteractiveBackground',
  component: InteractiveBackground,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Fullscreen 3D particle-network background built with three.js. Particles drift through a real 3D volume, links reconnect live with distance/depth falloff, and the pointer drives a damped camera parallax plus gentle repulsion. Colors follow the --line-color/--node-color CSS variables.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InteractiveBackground>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Default 3D network. Move the mouse to see the parallax camera offset and the particles drifting away from the cursor.',
      },
    },
  },
};

export const WithContent: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="relative min-h-screen bg-dark">
        <Story />
        <div className="relative z-10 p-8">
          <h1 className="text-4xl font-bold text-light mb-4">Interactive Background Demo</h1>
          <p className="text-gray-400 mb-4">
            Move your mouse around to see the 3D parallax and particle repulsion.
            The background network stays behind the content at all times.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-light font-semibold mb-2">Feature 1</h3>
              <p className="text-gray-400 text-sm">Content that appears above the interactive background.</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-light font-semibold mb-2">Feature 2</h3>
              <p className="text-gray-400 text-sm">The background effect is completely non-intrusive.</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-light font-semibold mb-2">Feature 3</h3>
              <p className="text-gray-400 text-sm">Smooth performance with pooled GPU buffers.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Interactive background with overlay content to demonstrate z-index layering and content interaction.',
      },
    },
  },
};

export const MobileFriendly: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story:
          'Mobile viewport. The network drops to a smaller particle count (touch devices) and touch drag drives the same repulsion.',
      },
    },
  },
};

export const PerformanceNotes: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Performance posture: device pixel ratio capped at 2, connection pass capped at 900 segments over preallocated buffers (no per-frame allocations), the loop pauses when the tab is hidden, and prefers-reduced-motion renders a single static frame.',
      },
    },
  },
};
