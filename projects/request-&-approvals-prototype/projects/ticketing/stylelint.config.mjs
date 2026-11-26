import stylesDeprecations from '../workspace-lint/deprecations/styles/index.mjs';

export default {
  extends: ['../workspace-lint/configs/stylelint-config.mjs', stylesDeprecations],
};
