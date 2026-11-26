export const ChatbotContext = {
  layoutDock: 'layout_dock',
  modal: 'modal',
  notifications: 'notifications',
  route: 'route',
  topBarDialog: 'top_bar_dialog',
} as const;

export type ChatbotContextET = (typeof ChatbotContext)[keyof typeof ChatbotContext];
