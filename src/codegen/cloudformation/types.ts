export interface CloudFormationFragment {
  readonly env?: Record<string, {Ref: string}>;
  readonly conditions?: Record<string, object>;
  readonly output?: Record<string, object>;
  readonly parameters?: Record<string, object>;
  readonly resources?: Record<string, object>;
}
