// This file is generated. Do not edit by hand.

import {assert, makeTriggerHandler} from '@ianwremmel/data';

import {handler as cdcHandler} from '../../handler';
import {unmarshallUserSession} from '../actions';

export const handler = makeTriggerHandler((record) => {
  assert(
    record.dynamodb.NewImage,
    'Expected DynamoDB Record to have a NewImage'
  );
  return cdcHandler(unmarshallUserSession(record.dynamodb.NewImage));
});
