export interface Table {
  readonly changeDataCaptureConfig?: ChangeDataCaptureConfig;
  readonly consistent: boolean;
  readonly dependenciesModuleId: string;
  readonly enablePointInTimeRecovery: boolean;
  readonly fields: readonly Field[];
  readonly libImportPath: string;
  readonly tableName: string;
  readonly typeName: string;
  readonly primaryKey: PrimaryKeyConfig;
  readonly secondaryIndexes: readonly SecondaryIndex[];
  readonly ttlConfig?: TTLConfig;
}

export interface Field {
  readonly columnName: string;
  readonly ean: string;
  readonly eav: string;
  readonly fieldName: string;
  readonly isDateType: boolean;
  readonly isRequired: boolean;
}

export type ChangeDataCaptureEvent = 'INSERT' | 'MODIFY' | 'REMOVE' | 'UPSERT';

export interface ChangeDataCaptureConfig {
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

export interface PartitionKey {
  isComposite: false;
  prefix: string;
  fields: readonly Field[];
}

export interface CompositeKey {
  isComposite: true;
  partitionKeyPrefix: string;
  partitionKeyFields: Field[];
  sortKeyPrefix: string;
  sortKeyFields: Field[];
}

export type PrimaryKeyConfig = PartitionKey | CompositeKey;

export interface TTLConfig {
  readonly fieldName: string;
  readonly duration: number;
}
