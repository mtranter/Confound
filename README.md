# Confound

[![mtranter](https://circleci.com/gh/mtranter/Confound.svg?style=shield)](https://app.circleci.com/pipelines/github/mtranter/Confound)

A typesafe, functional, configuration library for Typescript

Docs: https://mtranter.github.io/Confound/index.html

https://github.com/mtranter/Confound

Install:
```
npm install confound
```
or with Yarn:
```sh
yarn add confound
```


## Usage

```typescript
import { ConfigValueSource, ConfigValueSources } from 'confound'
const { env, envOrDie } = ConfigValueSources

interface AppConfig {
  appName: string,
  commitId?: string,
  environment: string,
  database: {
    host: string,
    port: number
  }
}

const configLoader = ConfigValueSources.obj<AppConfig>({
  appName: "Confounded App", // Use Litral Config Value
  commitId: env("COMMIT_ID"), // Extract optional config value from env variable
  environment: envOrDie("ENVIRONMENT"), // Extract required value from env variable
  database: { 
    host: envOrDie("DATABASE_HOST"),
    port: envOrDie("DATABASE_PORT").map(parseInt) // Map extracted config values to required types.
  }
})

const config: AppConfig = await configLoader()

```

## Custom config sources

Confound allows extension by adding custom ConfigValueSources.

For example, using a custom AWS SSM config source:

```typescript
import * as AWS from 'aws-sdk'

const ssm = new AWS.SSM({ region: "ap-southeast-2" })

const fromSSM = (name: string) => 
  ConfigValueSources
    .of(() => ssm.getParameter({ Name: name, WithDecryption: true })
    .promise()
    .then(v => v.Parameter?.Value))

const fromSSMOrDie = (name: string) => 
  ConfigValueSources
    .orDie(fromSSM(name), `Cannot find SSM Paramter ${name}`)

interface AppConfig {
  environment: string,
  database: {
    host: string,
    port: number,
    username: string,
    password: string
  }
}

const configLoader = ConfigValueSources.obj<AppConfig>({
  environment: envOrDie("ENVIRONMENT"),
  database: obj({
    host: envOrDie("DATABASE_HOST"),
    port: envOrDie("DATABASE_PORT").map(parseInt),
    username: envOrDie("DATABASE_USENAME_SSM_NAME").flatMap(fromSSMOrDie),
    password: envOrDie("DATABASE_PASSWORD_SSM_NAME").flatMap(fromSSMOrDie)
  })
})

const config: AppConfig = await configLoader()
```
