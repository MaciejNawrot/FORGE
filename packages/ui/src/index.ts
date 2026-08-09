/**
 * Cross-platform entrypoint. Everything exported here must stay
 * NativeWind-portable — Tailwind class strings only, no DOM access.
 *
 * Web-only components (Radix dialogs, tables) live behind the separate
 * `@acme/ui/web` entrypoint so a React Native bundle can never reach
 * them by importing the package root.
 */
export * from './lib/cn';
export * from './primitives/index';
