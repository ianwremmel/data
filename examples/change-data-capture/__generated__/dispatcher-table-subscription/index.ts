// This file is generated. Do not edit by hand.

import {makeDynamoDBStreamDispatcher} from '../../../..';
import * as dependencies from '../../../dependencies';

export const handler = makeDynamoDBStreamDispatcher({
  ...dependencies,
  modelName: 'Subscription',
  tableName: 'TableSubscription',
});
