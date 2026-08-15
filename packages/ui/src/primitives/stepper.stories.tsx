import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Stepper } from './stepper';

const meta = {
  title: 'Primitives/Stepper',
  component: Stepper,
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Weight: Story = {
  args: { value: 225, onChange: () => {}, unit: 'LBS', label: 'weight', step: 5 },
  render: () => {
    function Demo() {
      const [weight, setWeight] = useState(225);
      return <Stepper value={weight} onChange={setWeight} unit="LBS" label="weight" step={5} />;
    }
    return <Demo />;
  },
};

export const Reps: Story = {
  args: { value: 8, onChange: () => {}, unit: 'REPS', label: 'reps' },
  render: () => {
    function Demo() {
      const [reps, setReps] = useState(8);
      return <Stepper value={reps} onChange={setReps} unit="REPS" label="reps" />;
    }
    return <Demo />;
  },
};
