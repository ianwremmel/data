import type {EventBridgeClient} from '@aws-sdk/client-eventbridge';

export interface WithTableName {
  tableName: string;
}

export interface WithEventBridge {
  eventBridge: EventBridgeClient;
}
