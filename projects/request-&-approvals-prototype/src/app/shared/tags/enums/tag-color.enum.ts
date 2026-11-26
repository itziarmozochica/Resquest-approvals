// An enum, not a union: the colour grid iterates the values at runtime and needs a runtime object.
export enum TagColor {
  Accent = 'accent',
  Danger = 'danger',
  Neutral = 'neutral',
  Positive = 'positive',
  Primary = 'primary',
  Warning = 'warning',
}
