# Data

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Dependabot badge](https://img.shields.io/badge/Dependabot-active-brightgreen.svg)](https://dependabot.com/)

> An extensible DynamoDB client defined by a GraphQL schema.

## Table of Contents

<!-- toc -->

-   [Install](#install)
-   [Usage](#usage)
-   [Maintainer](#maintainer)
-   [Contribute](#contribute)
    -   [Testing](#testing)
-   [License](#license)

<!-- tocstop -->

## Install

## Usage

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
