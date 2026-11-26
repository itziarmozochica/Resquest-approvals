export interface FzAssistantHostConfig {
  viewId: string;
  actions?: Readonly<Record<string, (args?: Record<string, unknown>) => void | Promise<void>>>;
  /**
   * Host actions (including `submit`) that Discover advertises with `requires_confirmation: true`.
   *
   * Discover-only: this is an **advisory hint** for the agent. The runtime gate is Act — a step
   * targeting one of these ids halts `confirmation_message_required` when it carries no non-empty
   * `confirmation_message` (`isGatedActionStep`), and `confirmation_required` when it does, until
   * the Partner approves (§5.8). Trusting the agent alone is not enough for a safety control.
   */
  requireConfirmationFor?: ReadonlySet<string>;
  submit?: () => void | Promise<void>;
  submitEnabled?: () => boolean;
  viewState?: () => Record<string, unknown>;
}

export interface FzAssistantRegisteredHost {
  config: FzAssistantHostConfig;
  element: Element;
}
