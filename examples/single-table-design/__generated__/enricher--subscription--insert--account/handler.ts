// This file is generated. Do not edit by hand.

import {makeEnricher} from '@ianwremmel/data';

import {create, load, update} from '../../handler';
import type {
  Subscription,
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from '../actions';
import {createAccount, unmarshallSubscription, updateAccount} from '../actions';

export const handler = makeEnricher<
  Subscription,
  Account,
  CreateAccountInput,
  UpdateAccountInput
>(
  {create, load, update},
  {
    createTargetModel: createAccount,
    unmarshallSourceModel: unmarshallSubscription,
    updateTargetModel: updateAccount,
  }
);
