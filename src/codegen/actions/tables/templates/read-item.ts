import {ensureTableTemplate} from './ensure-table';
import {handleCommonErrors, objectToString} from './helpers';

export interface ReadItemTplInput {
  readonly consistent: boolean;
  readonly key: Record<string, string>;
  readonly tableName: string;
  readonly typeName: string;
}

/** template */
export function readItemTpl({
  consistent,
  key,
  tableName,
  typeName,
}: ReadItemTplInput) {
  const outputTypeName = `Read${typeName}Output`;
  const primaryKeyType = `${typeName}PrimaryKey`;

  return `
export type ${outputTypeName} = ResultType<${typeName}>;

/**  */
export async function read${typeName}(input: ${primaryKeyType}): Promise<Readonly<${outputTypeName}>> {
${ensureTableTemplate(tableName)}

  const commandInput: GetCommandInput = {
    ConsistentRead: ${consistent},
    Key: ${objectToString(key)},
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  };

  try {
    const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(new GetCommand(commandInput));

    assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

    assert(item, () => new NotFoundError('${typeName}', input));
    assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected \${JSON.stringify(input)} to load a ${typeName} but loaded \${item._et} instead\`));

    return {
      capacity,
      item: unmarshall${typeName}(item),
      metrics: undefined,
    }
  }
  catch (err) {
    ${handleCommonErrors()}
  }
}`;
}
