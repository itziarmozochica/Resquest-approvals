interface DatadogView {
  name: string;
  url: string;
}

interface DatadogViewState {
  lastView: DatadogView | null;
  processedViews: Map<string, DatadogView>;
}

export const viewState: DatadogViewState = {
  lastView: null,
  processedViews: new Map(),
};
