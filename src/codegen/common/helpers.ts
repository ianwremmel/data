import {GraphQLObjectType, isNonNullType, isScalarType} from 'graphql';

/** Finds all the fields belonging to objType of the specified typeName.*/
export function fieldsOfType(typeName: string, objType: GraphQLObjectType) {
  return Object.entries(objType.getFields()).filter(([, field]) => {
    let {type} = field;
    if (isNonNullType(type)) {
      type = type.ofType;
    }

    return isScalarType(type) && type.name === typeName;
  });
}

/** Indicates if objType contains the specified directive */
export function hasDirective(
  directiveName: string,
  objType: GraphQLObjectType
) {
  return !!objType.astNode?.directives
    ?.map(({name}) => name.value)
    .includes(directiveName);
}
