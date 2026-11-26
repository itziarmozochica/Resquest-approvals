export const quickSetupDescriptionDefaultTemplateKeyPrefix = 'createEvent.quickSetupWizard.step1.descriptionDefaultTemplate';

type TranslateFn = (key: string) => string;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const templateStrongTagRegex = /(<\/?strong>)/gi;

/** Escapes translated copy but keeps only {@code strong} tags from i18n (no other HTML). */
export function escapeTemplateInlineHtml(html: string): string {
  let isStrongOpen = false;

  return html
    .split(templateStrongTagRegex)
    .map(part => {
      if (part.toLowerCase() === '<strong>') {
        if (isStrongOpen) {
          return '';
        }

        isStrongOpen = true;

        return '<strong>';
      }

      if (part.toLowerCase() === '</strong>') {
        if (!isStrongOpen) {
          return '';
        }

        isStrongOpen = false;

        return '</strong>';
      }

      return escapeHtml(part);
    })
    .join('');
}

function templateKey(suffix: string): string {
  return `${quickSetupDescriptionDefaultTemplateKeyPrefix}.${suffix}`;
}

function templateHtmlParagraph(translate: TranslateFn, suffix: string): string {
  return `<p>${escapeTemplateInlineHtml(translate(templateKey(suffix)))}</p>`;
}

/** Default rich-text HTML prefilled in the quick-setup description field (with or without content questions). */
export function buildQuickSetupDefaultDescriptionHtml(translate: TranslateFn): string {
  const t = (suffix: string): string => escapeHtml(translate(templateKey(suffix)));
  const highlightItem = t('highlightItem');

  return [
    `<p>${t('introduction')}</p>`,
    '<p><br></p>',
    `<p><strong>${t('highlightsHeading')}</strong></p>`,
    '<ul>',
    `<li><p>${highlightItem}</p></li>`,
    `<li><p>${highlightItem}</p></li>`,
    `<li><p>${highlightItem}</p></li>`,
    `<li><p>${highlightItem}</p></li>`,
    '</ul>',
    '<p><br></p>',
    `<p><strong>${t('generalInfoHeading')}</strong></p>`,
    templateHtmlParagraph(translate, 'datesAndTimes'),
    templateHtmlParagraph(translate, 'duration'),
    templateHtmlParagraph(translate, 'ageRequirement'),
    templateHtmlParagraph(translate, 'accessibility'),
    templateHtmlParagraph(translate, 'important'),
    templateHtmlParagraph(translate, 'pleaseNote'),
    '<p><br></p>',
    `<p><strong>${t('descriptionHeading')}</strong></p>`,
    `<p>${t('descriptionDetail')}</p>`,
  ].join('');
}
