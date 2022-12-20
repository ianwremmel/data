# Data

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Dependabot badge](https://img.shields.io/badge/Dependabot-active-brightgreen.svg)](https://dependabot.com/)

> An extensible DynamoDB client defined by a GraphQL schema.

## Table of Contents

<!-- toc -->

-   [Install](#install)
-   [Usage](#usage)
    -   [Codegen](#codegen)
    -   [Runtime](#runtime)
-   [Known Issues](#known-issues)
-   [Maintainer](#maintainer)
-   [Contribute](#contribute)
    -   [Testing](#testing)
-   [License](#license)

<!-- tocstop -->

## Install

Even though you'll primarily use this as a build-time dependency, there are
necessary runtime components, so install it as a normal dependency, not a
development dependency.

```bash
npm install @ianwremmel/data
```

## Usage

### Codegen

`@ianwremmel/data` exposes two plugins for
[`graphql-codegen`](https://the-guild.dev/graphql/codegen). One plugin produces
a CloudFormation template that defines any of the tables you might need and the
other produces a set of type-definitions and typed functions for interacting
with the generated tables.

First, add the config to your graphql codegen config. There are a bunch of
different ways to use this beyond the scope of these docs, but here's a simple
example.

```yml
generates:
    ./__generated__/actions.ts:
        config:
            enumsAsTypes: true
            scalars:
                Date: Date
                JSONObject: Record<string, unknown>
            strictScalars: true
            dependenciesModuleId: ./dependencies
        plugins:
            - typescript
            - @ianwremmel/data/codegen/actions
    ./__generated__/template.yml:
        config:
            actionsModuleId: ./__generated__/actions
            dependenciesModuleId: ./dependencies
        plugins:
            - @ianwremmel/data/codegen/cloudformation
```

Note the `dependenciesModuleId`. This is any node-resolvable module that exports
the requisite injectable dependencies defined in
[src/runtime/dependencies.ts](src/runtime/dependencies.ts). These dependencies
are primarily AWS v3 clients and observability wrappers. Take a look at the
[example dependencies](examples/dependencies.ts) for more details.

### Runtime

You shouldn't need to use the runtime dependencies directly, but there's a set
of functions that were way easier to import than to try to include in codegen,
so you'll need `@ianwremmel/data` to be available at runtime (or, if you're
using esbuild, build-time _should_ be fine).

#### Error Handling

All Errors thrown or rethrown by this library (except `AssertionError` which is
the default Node `AssertionError`) or generated code are instance of
`BaseDataLibraryError`, which is a subclass of `Error`. Rethrown errors always
have a `cause` property that is the original error.

## Known Issues

-   Even though Dead Letter Queues are configured for CDC handlers, the Start
    DLQ Redrive button in the AWS console is disabled.
-   Generated lambdas are not tested in CI because of limitations in localstack,
    but they are tested manually against really AWS from time to time.
-   There's a branch where I've started working on OpenSearch support, but
    thanks to the localstack issues described above and the time it takes to
    deploy an actual OpenSearch cluster, there's no practical way to test it.

## Maintainer

[Ian Remmel](https://github.com/ianwremmel)

## Contribute

PRs welcome, but please open an issue to discuss anything but the smallest
changes first to make sure the change is in line with the project goals.

### Testing

There are two ways to run the example tests: directly in AWS or locally with
localstack. You can use `./script/deploy-examples-to-aws` or
`./script/deploy-examples-to-localstack` to deploy to the respective
environment. Once deployed, use `TEST_MODE=aws|localstack npm test` to run the
tests.

When testing against AWS, you'll either need to load credentials into your
environment (e.g. `TEST_MODE=aws aws-vault exec playground -- npm test`) or
configure a profile in `~/.aws/credentials` and `~/.aws/config` which will be
loaded automatically. By default, the profile name is `webstorm_playground`, but
you can override this by setting the `AWS_PROFILE` environment variable.

Setting up a profile will make things easier if you want to run tests from
within your IDE.

## License

MIT &copy; [Ian Remmel](https://github.com/ianwremmel) 2022 until at least now
