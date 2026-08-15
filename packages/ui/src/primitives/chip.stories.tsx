import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Chip } from './chip';

const meta = {
  title: 'Primitives/Chip',
  component: Chip,
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

const FILTERS = ['Full Body', 'Push', 'Pull', 'Legs', 'Core'];

export const FilterChips: Story = {
  render: () => {
    function Demo() {
      const [active, setActive] = useState(FILTERS[0]);
      return (
        <div className="flex flex-wrap gap-3">
          {FILTERS.map((filter) => (
            <Chip key={filter} selected={filter === active} onClick={() => setActive(filter)}>
              {filter}
            </Chip>
          ))}
        </div>
      );
    }
    return <Demo />;
  },
};

export const StaticTag: Story = {
  render: () => (
    <Chip tabIndex={-1} className="cursor-default px-2 py-1 text-xs">
      Chest
    </Chip>
  ),
};
