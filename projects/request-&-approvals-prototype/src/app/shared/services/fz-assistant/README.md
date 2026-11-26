# FZ Assistant DI (Discover / host / widget)

In-browser Discovery & Integration for FZ Assistant: capture → `view_context`, host registration, and (later) Act widget bridges.

## Docs

| Doc                                                                                                                     | Audience                              |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| [Feature DX — mount `[fzAssistantHost]` on a component or page](../../../../../docs/guides/fz-assistant-discover-dx.md) | Feature engineers                     |
| Wire / capture models                                                                                                   | `src/app/shared/models/fz-assistant/` |

## Layout

| Folder                       | Responsibility                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `discover/`                  | Capture, ref registry, Discover facade, `describe_view` binder                                                         |
| `host/`                      | `[fzAssistantHost]` directive + host registry (single active host)                                                     |
| `integration/`               | Sequential Act runner: the seven ops, contracts-first fill routing, plain HTML native fallback, core confirmation gate |
| `widget/`                    | Widget registry / capable registration (Integration)                                                                   |
| `provide-fz-assistant-di.ts` | Root DI providers for the above                                                                                        |

Start with the **feature DX** guide when mounting a screen.
