/**
 * AUTO-GENERATED — do not edit.
 * Source: fz-assistant-mcp-app-host-theme.scss (Ignite foundations)
 * Regenerate: node src/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-message/ui-components/chatbot-mcp-app/compile-host-theme.mjs
 */
export const MCP_APP_HOST_THEME_CSS = `@charset "UTF-8";

:root {
  color-scheme: light;
  --button-color-background-primary: #0079ca;
  --button-color-background-primary-hover: #0068b0;
  --button-color-foreground-primary: #ffffff;
  --button-color-foreground-primary-hover: #ffffff;
  --button-color-foreground-secondary: #0079ca;
  --button-color-foreground-secondary-hover: #005795;
  --button-color-border-secondary: #ccd2d8;
  --button-color-border-secondary-hover: #ccd2d8;
}

html {
  height: auto;
  min-height: 0;
  font-family: "Montserrat", sans-serif;
}

*,
*::before,
*::after {
  font-family: inherit;
}

body {
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 0.75rem;
  font: 400 1rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #031419;
  background: #ffffff;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 0 0 0.5rem;
  color: #031419;
}

h1 {
  font: 600 1.25rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
}

h2 {
  font: 600 1.125rem / 1.75rem var(--ignt-font-family, "Montserrat", sans-serif);
  margin-bottom: 0.5rem;
}
h2::after {
  content: "";
  display: block;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
  border: 0;
  border-top: 0.0625rem solid #ccd2d8;
}

hr {
  margin: 0 0 0.75rem;
  border: 0;
  border-top: 0.0625rem solid #ccd2d8;
}

h3 {
  font: 600 1rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
}

h4,
h5,
h6 {
  font: 600 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
}

h1 + p,
h2 + p,
h3 + p {
  margin-top: 0.25rem;
  font: 400 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #536b75;
}

p {
  margin: 0 0 0.75rem;
  font: 400 1rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #031419;
}

small {
  font: 400 0.75rem / 1rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #536b75;
}

fieldset {
  border: none;
  margin: 0 0 0.75rem;
  padding: 0;
}

legend {
  display: block;
  margin-bottom: 0.5rem;
  padding: 0;
  font: 600 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #031419;
}

label {
  display: block;
  margin-bottom: 0.25rem;
  font: 600 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #031419;
}

label:has(input[type=checkbox]),
label:has(input[type=radio]) {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  margin-right: 0.5rem;
  font: 400 1rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
}

input,
select,
textarea {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 0.75rem;
  min-height: 2rem;
  padding: 0.5rem 0.75rem;
  border: 0.0625rem solid var(--input-color-border, #ccd2d8);
  border-radius: var(--input-dimensions-radii, 0.5rem);
  background: #ffffff;
  color: #031419;
  font: 400 1rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
}

input::placeholder,
textarea::placeholder {
  color: #a7b2ba;
}

input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  border-color: #0068b0;
  box-shadow: inset 0 0 0 0.0625rem #0068b0;
  outline: 0.25rem solid rgba(0, 137, 227, 0.32);
  outline-offset: 0;
}

input:disabled,
select:disabled,
textarea:disabled {
  background: #f2f3f3;
  color: #a7b2ba;
  cursor: not-allowed;
}

input:user-invalid,
select:user-invalid,
textarea:user-invalid,
input[aria-invalid=true],
select[aria-invalid=true],
textarea[aria-invalid=true] {
  border-color: #eb0052;
  color: #eb0052;
}

input[type=checkbox],
input[type=radio] {
  width: auto;
  min-height: auto;
  margin-right: 0.5rem;
  margin-bottom: 0;
  accent-color: var(--button-color-background-primary, #0079ca);
}

details {
  margin-bottom: 0.75rem;
}

summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border: none;
  border-radius: 0;
  font: 600 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #0079ca;
  background: transparent;
  cursor: pointer;
  list-style: none;
  appearance: none;
  user-select: none;
}
summary::-webkit-details-marker {
  display: none;
}
summary::marker {
  content: "";
}
summary::before {
  content: "▸";
  font-size: 0.75rem;
  line-height: 1;
  transition: transform 120ms ease-in-out;
}
summary:hover {
  color: #005795;
  background: transparent;
}
summary:focus, summary:focus-visible, summary:active {
  background: transparent;
  outline: none;
}
summary:focus-visible {
  outline: 0.25rem solid rgba(0, 137, 227, 0.32);
  outline-offset: 0.25rem;
}
summary::selection {
  background: transparent;
  color: inherit;
}

details[open] summary::before {
  transform: rotate(90deg);
}

details[open] summary {
  margin-bottom: 0.5rem;
}

button,
input[type=button],
input[type=reset],
input[type=submit] {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  min-width: 4rem;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0 0.75rem;
  border: 0.125rem solid transparent;
  border-radius: 4rem;
  font: 600 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
  cursor: pointer;
  width: auto;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
button::selection,
input[type=button]::selection,
input[type=reset]::selection,
input[type=submit]::selection {
  background: transparent;
  color: inherit;
}

button[type=button],
input[type=button],
button[type=reset],
input[type=reset] {
  border-color: #ccd2d8 !important;
  background: #ffffff !important;
  color: #0079ca !important;
}

button:not([type]),
button[type=submit],
input[type=submit] {
  border-color: transparent !important;
  background: #0079ca !important;
  color: #ffffff !important;
}

button[type=button]:not(:disabled):hover,
input[type=button]:not(:disabled):hover,
button[type=reset]:not(:disabled):hover,
input[type=reset]:not(:disabled):hover {
  border-color: #ccd2d8 !important;
  background: #ffffff !important;
  color: #005795 !important;
}

button:not([type]):not(:disabled):hover,
button[type=submit]:not(:disabled):hover,
input[type=submit]:not(:disabled):hover {
  border-color: transparent !important;
  background: #0068b0 !important;
  color: #ffffff !important;
}

button:not(:disabled):focus-visible,
input[type=button]:not(:disabled):focus-visible,
input[type=reset]:not(:disabled):focus-visible,
input[type=submit]:not(:disabled):focus-visible {
  outline: 0.25rem solid rgba(0, 137, 227, 0.32);
  outline-offset: 0;
}

button:disabled,
input[type=button]:disabled,
input[type=reset]:disabled,
input[type=submit]:disabled {
  background: #f2f3f3 !important;
  border-color: #f2f3f3 !important;
  color: #a7b2ba !important;
  cursor: not-allowed;
}`;
