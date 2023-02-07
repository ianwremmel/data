import type {HandlerConfig} from '../parser';

export interface ActionPluginConfig {
  readonly dependenciesModuleId: string;
  /**
   * When true, reads and writes `skFields: []` as `${skPrefix}#0` instead of
   * `${skPrefix}`. This is a workaround for behavior in a piece of internal
   * tooling and should never be used otherwise,
   */
  readonly legacyEmptySortFieldBehavior?: boolean;

  readonly defaultDispatcherConfig?: HandlerConfig;
  readonly defaultHandlerConfig?: HandlerConfig;
}
