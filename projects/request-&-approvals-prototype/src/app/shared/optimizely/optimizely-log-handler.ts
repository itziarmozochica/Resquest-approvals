import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { Config, enums } from '@optimizely/optimizely-sdk';

type LogHandler = NonNullable<Config['logger']>;
type LogLevel = Parameters<LogHandler['log']>[0];

const missingFeatureKeyPattern = /Feature key .+ is not in datafile\.$/;

export const optimizelyLogFlushDelayMs = 5000;

export class OptimizelyLogHandler implements LogHandler {
  #console: LogHandler | null;
  #datadog: Pick<DatadogLogService, 'logError'>;
  #flushTimer: ReturnType<typeof setTimeout> | null = null;
  #forwarded = new Set<string>();
  #pending = new Map<string, number>();

  constructor(datadog: Pick<DatadogLogService, 'logError'>, consoleHandler: LogHandler | null) {
    this.#datadog = datadog;
    this.#console = consoleHandler;
  }

  log(level: LogLevel, message: string): void {
    try {
      this.#console?.log(level, message);

      if (level < enums.LOG_LEVEL.ERROR || missingFeatureKeyPattern.test(message) || this.#forwarded.has(message)) {
        return;
      }

      this.#pending.set(message, (this.#pending.get(message) ?? 0) + 1);
      if (!this.#flushTimer) {
        this.#flushTimer = setTimeout(() => this.#flush(), optimizelyLogFlushDelayMs);
      }
    } catch {
      return;
    }
  }

  #flush(): void {
    this.#flushTimer = null;
    const pending = Array.from(this.#pending);
    this.#pending.clear();

    pending.forEach(([message, occurrences]) => {
      this.#forwarded.add(message);
      try {
        this.#datadog.logError(`[OPTIMIZELY] ${message}`, { optimizely: { occurrences, windowMs: optimizelyLogFlushDelayMs } });
      } catch {
        return;
      }
    });
  }
}
