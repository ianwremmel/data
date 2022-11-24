import type {CloudFormationFragment} from '../types';

/** Combines multiple fragments into a single fragment. */
export function combineFragments(
  ...fragments: CloudFormationFragment[]
): CloudFormationFragment {
  return fragments.reduce(
    (acc, fragment) => ({
      conditions: {...acc.conditions, ...fragment.conditions},
      env: {...acc.env, ...fragment.env},
      output: {...acc.output, ...fragment.output},
      parameters: {...acc.parameters, ...fragment.parameters},
      resources: {...acc.resources, ...fragment.resources},
    }),
    {
      env: {},
      output: {},
      parameters: {},
      resources: {},
    }
  );
}
