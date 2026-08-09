import { tailwindPreset } from '@acme/design-tokens/tailwind-preset';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Text } from '../src/index';

/**
 * Every swatch below is derived from the generated Tailwind preset rather
 * than hardcoded, so this page cannot drift from
 * packages/design-tokens/src/tokens.json. Flip the Theme toolbar control
 * to see the semantic colors resolve against the dark palette.
 */
const theme = tailwindPreset.theme.extend;

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <Stack direction="row" gap="sm" align="center">
      <div
        className="border-border h-10 w-10 shrink-0 rounded-md border"
        style={{ backgroundColor: value }}
      />
      <Stack gap="none">
        <Text variant="caption">{name}</Text>
        <Text variant="code" tone="muted">
          {value}
        </Text>
      </Stack>
    </Stack>
  );
}

function ScaleRow({ name, value }: { name: string; value: string }) {
  return (
    <Stack direction="row" gap="md" align="center" justify="between">
      <Text variant="code">{name}</Text>
      <Text variant="code" tone="muted">
        {value}
      </Text>
    </Stack>
  );
}

const meta = {
  title: 'Design tokens/Overview',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {
  render: () => (
    <Stack gap="lg">
      <Text variant="heading">Semantic colors</Text>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(theme.colors).map(([name, value]) => (
          <Swatch key={name} name={name} value={value as string} />
        ))}
      </div>
    </Stack>
  ),
};

export const Spacing: Story = {
  render: () => (
    <Stack gap="md">
      <Text variant="heading">Spacing</Text>
      {Object.entries(theme.spacing).map(([name, value]) => (
        <ScaleRow key={name} name={`spacing-${name}`} value={value as string} />
      ))}
    </Stack>
  ),
};

export const Radius: Story = {
  render: () => (
    <Stack gap="md">
      <Text variant="heading">Radius</Text>
      {Object.entries(theme.borderRadius).map(([name, value]) => (
        <ScaleRow key={name} name={`radius-${name}`} value={value as string} />
      ))}
    </Stack>
  ),
};

export const Typography: Story = {
  render: () => (
    <Stack gap="lg">
      <Text variant="heading">Typography</Text>
      <Stack gap="md">
        {Object.entries(theme.fontSize).map(([name, value]) => (
          <ScaleRow key={name} name={`text-${name}`} value={value as string} />
        ))}
      </Stack>
      <Stack gap="sm">
        <Text variant="heading">Heading</Text>
        <Text variant="subheading">Subheading</Text>
        <Text variant="body">Body text</Text>
        <Text variant="caption" tone="muted">
          Caption, muted tone
        </Text>
        <Text variant="code">Code</Text>
      </Stack>
    </Stack>
  ),
};
