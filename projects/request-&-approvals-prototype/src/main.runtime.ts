import { loadRuntimeConfig, showRuntimeConfigError } from './environments/runtime/runtime-config.util';

loadRuntimeConfig(document).then(
  () => import('./bootstrap'),
  (error: unknown) => showRuntimeConfigError(document, error),
);
