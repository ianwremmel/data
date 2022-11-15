export interface CloudFormationFragment {
  env?: Record<string, {Ref: string}>;
  output?: Record<string, object>;
  resources?: Record<string, object>;
}
