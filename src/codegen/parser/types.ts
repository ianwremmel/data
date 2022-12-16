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
  readonly isScalarType: boolean;
  readonly typeName: string;
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

export type GSI = {
  readonly name: string;
  readonly type: 'gsi';
} & (PartitionKey | CompositeKey);

export interface LSI {
  readonly isComposite: true;
  readonly fields: readonly Field[];
  readonly name: string;
  readonly type: 'lsi';
  readonly prefix: string;
}

export type SecondaryIndex = GSI | LSI;

export interface PartitionKey {
  readonly fields: readonly Field[];
  readonly isComposite: false;
  readonly prefix: string;
}

export interface CompositeKey {
  readonly isComposite: true;
  readonly partitionKeyPrefix: string;
  readonly partitionKeyFields: Field[];
  readonly sortKeyPrefix: string;
  readonly sortKeyFields: Field[];
}

export type PrimaryKeyConfig = {type: 'primary'} & (
  | PartitionKey
  | CompositeKey
);

export interface TTLConfig {
  readonly fieldName: string;
  readonly duration: number;
}
