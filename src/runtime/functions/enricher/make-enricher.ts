import assert from 'assert';

import type {DynamoDBRecord, EventBridgeHandler} from 'aws-lambda';

import type {WithTelemetry} from '../../dependencies';
import {NotFoundError} from '../../errors';
import type {ResultType} from '../../types';
import {unmarshallRecord} from '../common/unmarshall-record';
import {makeLambdaOTelAttributes} from '../telemetry';

type Loader<SOURCE, TARGET> = (record: SOURCE) => Promise<TARGET>;
type Creator<SOURCE, TARGET> = (record: SOURCE) => Promise<TARGET | undefined>;
type Updater<SOURCE, TARGET, UPDATE_TARGET_INPUT> = (
  record: SOURCE,
  target: TARGET
) => Promise<UPDATE_TARGET_INPUT | undefined>;

interface Projector<SOURCE, TARGET, CREATE_TARGET_INPUT, UPDATE_TARGET_INPUT> {
  load: Loader<SOURCE, TARGET>;
  create: Creator<SOURCE, CREATE_TARGET_INPUT>;
  update: Updater<SOURCE, TARGET, UPDATE_TARGET_INPUT>;
}

interface SDK<SOURCE, TARGET, CREATE_TARGET_INPUT, UPDATE_TARGET_INPUT> {
  createTargetModel: (
    target: CREATE_TARGET_INPUT
  ) => Promise<ResultType<TARGET>>;
  unmarshallSourceModel: (item: Record<string, unknown>) => SOURCE;
  updateTargetModel: (
    target: UPDATE_TARGET_INPUT
  ) => Promise<ResultType<TARGET>>;
}

/**
 * Returns a function that handles a DynamoDB for the SOURCE and produces a
 * TARGET
 */
export function makeEnricher<
  SOURCE,
  TARGET,
  CREATE_TARGET_INPUT,
  UPDATE_TARGET_INPUT
>(
  dependencies: WithTelemetry,
  {
    create,
    load,
    update,
  }: Projector<SOURCE, TARGET, CREATE_TARGET_INPUT, UPDATE_TARGET_INPUT>,
  {
    createTargetModel,
    unmarshallSourceModel,
    updateTargetModel,
  }: SDK<SOURCE, TARGET, CREATE_TARGET_INPUT, UPDATE_TARGET_INPUT>
): EventBridgeHandler<
  Exclude<DynamoDBRecord['eventName'], undefined> | string,
  DynamoDBRecord,
  unknown
> {
  const {captureAsyncFunction} = dependencies;
  return async (event, context) =>
    captureAsyncFunction(
      `${event.resources[0]} process`,
      makeLambdaOTelAttributes(context),
      async () => {
        const ddbRecord = event.detail;
        const unmarshalledRecord = unmarshallRecord(ddbRecord);
        assert(unmarshalledRecord.dynamodb?.NewImage);
        const source = unmarshallSourceModel(
          unmarshalledRecord.dynamodb?.NewImage
        );
        assert(source);

        try {
          const item = await load(source);

          const modelToUpdate = await update(source, item);
          if (modelToUpdate) {
            return await updateTargetModel(modelToUpdate);
          }
        } catch (err) {
          if (err instanceof NotFoundError) {
            const modelToCreate = await create(source);
            if (modelToCreate) {
              return await createTargetModel(modelToCreate);
            }
          }
          throw err;
        }
      }
    );
}
