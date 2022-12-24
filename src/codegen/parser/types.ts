export interface Table {
  readonly dependenciesModuleId: string;
  readonly enablePointInTimeRecovery: boolean;
  readonly enableStreaming: boolean;
  readonly hasCdc: boolean;
  readonly hasPublicModels: boolean;
  readonly hasTtl: boolean;
  readonly libImportPath: string;
  readonly primaryKey: TablePrimaryKeyConfig;
  readonly secondaryIndexes: readonly TableSecondaryIndex[];
  readonly tableName: string;
}

export interface TablePrimaryKeyConfig {
  readonly isComposite: boolean;
}

export interface TableSecondaryIndex {
  readonly isComposite: boolean;
  readonly name: string;
  readonly type: 'gsi' | 'lsi';
}

export interface Model {
  readonly changeDataCaptureConfig?: ChangeDataCaptureConfig;
  readonly consistent: boolean;
  readonly dependenciesModuleId: string;
  readonly enablePointInTimeRecovery: boolean;
  readonly enableStreaming: boolean;
  readonly fields: readonly Field[];
  readonly isPublicModel: boolean;
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
  readonly handlerModuleId: string;
  readonly sourceModelName: string;
  readonly targetTable: string;
}

export type GSI = {
  readonly name: string;
  readonly type: 'gsi';
} & (PartitionKey | CompositeKey);

export interface LSI {
  readonly isComposite: true;
  readonly name: string;
  readonly type: 'lsi';
  readonly sortKeyFields: readonly Field[];
  readonly sortKeyPrefix?: string;
}

export type SecondaryIndex = GSI | LSI;

export interface PartitionKey {
  readonly isComposite: false;
  readonly partitionKeyFields: readonly Field[];
  readonly partitionKeyPrefix?: string;
}

export interface CompositeKey {
  readonly isComposite: true;
  readonly partitionKeyPrefix?: string;
  readonly partitionKeyFields: Field[];
  readonly sortKeyPrefix?: string;
  readonly sortKeyFields: Field[];
}

export type PrimaryKeyConfig = {type: 'primary'} & (
  | PartitionKey
  | CompositeKey
);

export interface TTLConfig {
  readonly fieldName: string;
  readonly duration?: number;
}
