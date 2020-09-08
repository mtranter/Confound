# Confound

A typesafe, functional, configuration library for Typescript


## Usage

```typescript
import { ConfigValueSource, ConfigValueSources } from './confound'

interface NestedConfig {
  age: number
}

interface MyConfig {
  name: string,
  nested: NestedConfig
}

const configSource: ConfigValueSource<MyConfig> =
      ConfigValueSources.obj<MyConfig>({
        name: "Confound",
        nested: {
          age: 1
        }
      })

const config: MyConfig = await configSource()


```

### Whats the point?

* Centralise Config definitions with standard error handling:

```typescript
import { ConfigValueSource, ConfigValueSources } from './confound'

const { envOrDie, obj } = ConfigValueSources

process.env["CONFOUND_NAME"] = "Confound"
process.env["CONFOUND_AGE"] = "1"

const configSource: ConfigValueSource<MyConfig> = obj<MyConfig>({
  name: envOrDie("CONFOUND_NAME"),
  nested: obj({
    age: envOrDie("CONFOUND_AGE").map(parseInt)
  })
})

const config: MyConfig = await configSource()
```

### Why return a Promise?

Confound allows extension by adding custom ConfigValueSources.
For example, using a custom AWS SSM config source:

```typescript

const ssm = new AWS.SSM({ region: "ap-southeast-2" })

const fromSSM = (name: string) => ConfigValueSources.of(() => ssm.getParameter({ Name: name, WithDecryption: true }).promise().then(v => v.Parameter?.Value))

const fromSSMOrDie = (name: string) => ConfigValueSources.orDie(fromSSM(name), `Cannot find SSM Paramter ${name}`)

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

```
