export const DashboardBuilderActionSource = {
  chartCardMenu: 'chart_card_menu',
  guidedSteps: 'guided_steps',
  tabsActionButton: 'tabs_action_button',
} as const;

export type DashboardBuilderActionSourceET = (typeof DashboardBuilderActionSource)[keyof typeof DashboardBuilderActionSource];
