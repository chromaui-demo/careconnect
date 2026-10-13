// @careconnect/api-client is compiled from source and reads Vite's
// `import.meta.env`. Under Metro, Expo's import.meta polyfill has no `env`, so
// the client falls back via optional chaining; this only types that read.
interface ImportMeta {
  readonly env?: { readonly VITE_API_URL?: string };
}
