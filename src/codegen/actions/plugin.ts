import assert from 'assert';
import {readFileSync} from 'fs';
import path from 'path';

import {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import {assertObjectType, GraphQLObjectType} from 'graphql';

import {ActionPluginConfig} from './config';
import {
  createItemTemplate,
  deleteItemTemplate,
  readItemTemplate,
} from './tables/simple-table';

/** @override */
export function addToSchema(): AddToSchemaResult {
  return readFileSync(path.resolve(__dirname, '../schema.graphqls'), 'utf8');
}

/** @override */
export const plugin: PluginFunction<ActionPluginConfig> = (
  schema,
  documents,
  config,
  info
) => {
  const typesMap = schema.getTypeMap();

  const simpleTableTypes = Object.keys(typesMap)
    .filter((typeName) => {
      const type = typesMap[typeName];
      const {astNode} = type;

      if (
        astNode?.kind === 'ObjectTypeDefinition' &&
        astNode.interfaces?.map(({name}) => name.value).includes('SimpleModel')
      ) {
        return true;
      }

      return false;
    })
    .map((typeName) => {
      const objType = typesMap[typeName];
      assertObjectType(objType);
      return objType;
    });

  const content = simpleTableTypes
    .map((t) => {
      assertObjectType(t);
      // I don't know why this has to be cast here, but not 6 lines up.
      const objType: GraphQLObjectType = t as GraphQLObjectType;

      return [
        createItemTemplate(objType),
        deleteItemTemplate(objType),
        readItemTemplate(objType),
      ].join('\n\n');
    })
    .join('\n');

  assert(info?.outputFile, 'info.outputFile is required');

  return {
    content,
    prepend: [
      `import assert from 'assert'`,
      `import {v4 as uuidv4} from 'uuid'`,
      `import {DeleteCommand, GetCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb'`,
      `import {ddbDocClient} from "${path.relative(
        path.resolve(process.cwd(), path.dirname(info.outputFile)),
        path.resolve(process.cwd(), config.pathToDocumentClient)
      )}"`,
    ],
  };
};
