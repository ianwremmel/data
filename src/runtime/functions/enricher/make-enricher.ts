import assert from 'assert';

import {NotFoundError} from '../../errors';
import type {ResultType} from '../../types';
import type {Handler} from '../common/handlers';
import {makeSqsHandler} from '../common/handlers';

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
  enricher: Projector<SOURCE, TARGET, CREATE_TARGET_INPUT, UPDATE_TARGET_INPUT>,
  sdk: SDK<SOURCE, TARGET, CREATE_TARGET_INPUT, UPDATE_TARGET_INPUT>
): Handler {
  const {unmarshallSourceModel} = sdk;

  return makeSqsHandler(async (unmarshalledRecord) => {
    assert(unmarshalledRecord.dynamodb?.NewImage);
    const source = unmarshallSourceModel(unmarshalledRecord.dynamodb?.NewImage);
    assert(source);

    await enrich(enricher, sdk, source);
  });
}

/** Enriches the source model into the target model */
async function enrich<SOURCE, TARGET, CREATE_TARGET_INPUT, UPDATE_TARGET_INPUT>(
  enricher: Projector<SOURCE, TARGET, CREATE_TARGET_INPUT, UPDATE_TARGET_INPUT>,
  sdk: SDK<SOURCE, TARGET, CREATE_TARGET_INPUT, UPDATE_TARGET_INPUT>,
  source: SOURCE
) {
  const {create, load, update} = enricher;
  const {createTargetModel, updateTargetModel} = sdk;
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
