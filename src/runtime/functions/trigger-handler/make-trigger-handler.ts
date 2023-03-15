import type {Callback, Handler} from '../common/handlers';
import {makeSqsHandler} from '../common/handlers';

/**
 * Makes an SQS handler that expects the payload to be a DynamoDB Stream Record.
 */
export function makeTriggerHandler(cb: Callback): Handler {
  return makeSqsHandler(cb);
}
