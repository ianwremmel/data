// This file is generated. Do not edit by hand.

import {assert, makeModelChangeHandler} from '../../../..';
import * as dependencies from '../../../dependencies';
import {handler as cdcHandler} from '../../handler';
import {unmarshallSubscription} from '../actions';

export const handler = makeModelChangeHandler(dependencies, (record) => {
  assert(
    record.dynamodb.NewImage,
    'Expected DynamoDB Record to have a NewImage'
  );
  return cdcHandler(unmarshallSubscription(record.dynamodb.NewImage));
});
