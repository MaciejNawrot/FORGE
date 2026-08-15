import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SegmentedControl } from './segmented-control';

const meta = {
  title: 'Primitives/SegmentedControl',
  component: SegmentedControl,
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
];

export const Default: Story = {
  args: { options: OPTIONS, value: 'all', onChange: () => {} },
  render: () => {
    function Demo() {
      const [tab, setTab] = useState('all');
      return <SegmentedControl value={tab} onChange={setTab} options={OPTIONS} />;
    }
    return <Demo />;
  },
};
