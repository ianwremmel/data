import type {WithTelemetry} from '../../dependencies';
import type {Callback, Handler} from '../common/handlers';
import {makeEventBridgeHandler} from '../common/handlers';

/**
 * Makes an SQS handler that expects the payload to be a DynamoDB Stream Record.
 */
export function makeTriggerHandler(
  dependencies: WithTelemetry,
  cb: Callback
): Handler {
  return makeEventBridgeHandler(dependencies, cb);
}
