export interface Table {
  readonly changeDataCaptureConfig?: ChangeDataCaptureConfig;
  readonly consistent: boolean;
  readonly dependenciesModuleId: string;
  readonly enablePointInTimeRecovery: boolean;
  readonly libImportPath: string;
  readonly name: string;
  readonly primaryKey: PrimaryKeyConfig;
  readonly secondaryIndexes: readonly SecondaryIndex[];
  readonly ttlConfig?: TTLConfig;
}

export type ChangeDataCaptureEvent = 'INSERT' | 'MODIFY' | 'REMOVE' | 'UPSERT';

export interface ChangeDataCaptureConfig {
  readonly actionsModuleId: string;
  readonly event: ChangeDataCaptureEvent;
  readonly dispatcherFunctionName: string;
  readonly dispatcherFileName: string;
  readonly dispatcherOutputPath: string;
  readonly handlerFileName: string;
  readonly handlerFunctionName: string;
  readonly handlerModuleId: string;
  readonly handlerOutputPath: string;
  readonly sourceModelName: string;
  readonly targetTable: string;
}

export interface GSI {
  readonly isComposite: boolean;
  readonly name: string;
  readonly type: 'gsi';
}

export interface LSI {
  readonly name: string;
  readonly type: 'lsi';
}

export type SecondaryIndex = GSI | LSI;

export interface PrimaryKeyConfig {
  readonly isComposite: boolean;
}

export interface TTLConfig {
  readonly fieldName: string;
  readonly duration: number;
}
