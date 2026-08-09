import type { Decorator, Preview } from '@storybook/react-vite';
import './preview.css';

/**
 * Renders each story inside a `data-theme` wrapper. The dark-mode custom
 * properties in @acme/design-tokens are scoped to `[data-theme="dark"]`,
 * so they cascade to everything inside this div — which means the toolbar
 * toggle exercises the real token switching, not a Storybook-only mock.
 */
const withTheme: Decorator = (Story, context) => (
  <div data-theme={context.globals.theme} className="bg-background text-foreground p-6">
    <Story />
  </div>
);

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: { theme: 'light' },
  globalTypes: {
    theme: {
      description: 'Design token theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
