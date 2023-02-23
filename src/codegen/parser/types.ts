import type {Nullable} from '../../types';

export interface IntermediateRepresentation {
  readonly dependenciesModuleId: string;
  readonly additionalImports: readonly Import[];
  readonly models: readonly Model[];
  readonly tables: readonly Table[];
}

export interface Import {
  readonly importName: string;
  readonly importPath: string;
}

export interface ComputeFunction extends Import {
  readonly isVirtual: boolean;
}

export interface BaseTable {
  readonly dependenciesModuleId: string;
  readonly enablePointInTimeRecovery: boolean;
  readonly enableStreaming: boolean;
  readonly hasPublicModels: boolean;
  readonly hasTtl: boolean;
  readonly libImportPath: string;
  readonly primaryKey: TablePrimaryKeyConfig;
  readonly secondaryIndexes: readonly TableSecondaryIndex[];
  readonly tableName: string;
}

export interface TableWithCdc extends BaseTable {
  readonly dispatcherConfig: DispatcherConfig;
  readonly hasCdc: true;
}

export interface TableWithoutCdc extends BaseTable {
  readonly hasCdc: false;
}

export type Table = TableWithCdc | TableWithoutCdc;

export interface TablePrimaryKeyConfig {
  readonly isComposite: boolean;
}

export interface TableSecondaryIndex {
  readonly isComposite: boolean;
  readonly isSingleField: boolean;
  readonly name: string;
  readonly projectionType: 'all' | 'keys_only';
  readonly type: 'gsi' | 'lsi';
}

export interface Model {
  readonly changeDataCaptureConfig: readonly ChangeDataCaptureConfig[];
  readonly consistent: boolean;
  readonly dependenciesModuleId: string;
  readonly enablePointInTimeRecovery: boolean;
  readonly enableStreaming: boolean;
  readonly fields: readonly Field[];
  readonly isLedger: boolean;
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
  /**
   * In order to handle the possibility of legacy tables, read all possible
   * column permutations
   */
  readonly columnNamesForRead: readonly string[];
  readonly computeFunction: ComputeFunction | undefined;
  readonly ean: string;
  readonly eav: string;
  readonly fieldName: string;
  readonly isDateType: boolean;
  readonly isRequired: boolean;
  readonly isScalarType: boolean;
  readonly typeName: string;
}

export type ChangeDataCaptureEvent = 'INSERT' | 'MODIFY' | 'REMOVE' | 'UPSERT';

export type ChangeDataCaptureConfig =
  | ChangeDataCaptureEnricherConfig
  | ChangeDataCaptureTriggerConfig;

export interface ChangeDataCaptureEnricherConfig {
  readonly dispatcherConfig: DispatcherConfig;
  readonly event: ChangeDataCaptureEvent;
  readonly handlerConfig: HandlerConfig;
  readonly handlerModuleId: string;
  readonly sourceModelName: string;
  readonly targetModelName: string;
  readonly writableTables: readonly string[];
  readonly type: 'ENRICHER';
}

export interface ChangeDataCaptureTriggerConfig {
  readonly dispatcherConfig: DispatcherConfig;
  readonly event: ChangeDataCaptureEvent;
  readonly handlerConfig: HandlerConfig;
  readonly handlerModuleId: string;
  readonly readableTables: readonly string[];
  readonly sourceModelName: string;
  readonly writableTables: readonly string[];
  readonly type: 'TRIGGER';
}

export type GSI = {
  readonly isSingleField: boolean;
  readonly name: string;
  readonly projectionType: 'all' | 'keys_only';
  readonly type: 'gsi';
} & (PartitionKey | CompositeKey);

export interface LSI {
  readonly isComposite: true;
  readonly isSingleField: false;
  readonly name: string;
  readonly projectionType: 'all' | 'keys_only';
  readonly type: 'lsi';
  readonly sortKeyFields: readonly Field[];
  readonly sortKeyPrefix?: string;
}

export type SecondaryIndex = GSI | LSI;

export interface PartitionKey {
  readonly isComposite: false;
  readonly isSingleField: boolean;
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

export interface LambdaConfig {
  readonly memorySize: number;
  readonly timeout: number;
}

export type DispatcherConfig = LambdaConfig;

export type HandlerConfig = LambdaConfig;
