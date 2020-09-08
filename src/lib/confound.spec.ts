import { ConfigValueSource, ConfigValueSources } from './confound'

const { env, envOr, envOrDie, obj } = ConfigValueSources

interface NestedConfig {
  id?: string
  age: number
}

interface MyConfig {
  name: string,
  nested: NestedConfig
}

describe("Confound", () => {

  beforeEach(() => {
    Object.keys(process.env).filter(e => e.startsWith("CONFOUND_")).forEach(e => delete process.env[e])
  })

  it("Should load Config from literals", async () => {
    const configSource: ConfigValueSource<MyConfig> =
      ConfigValueSources.obj<MyConfig>({
        name: "Confound",
        nested: {
          age: 1
        }
      })
    const config: MyConfig = await configSource()
    expect(config).toEqual({
      name: "Confound",
      nested: {
        age: 1
      }
    })
  })
  it("Should load Config from the environment", async () => {
    process.env["CONFOUND_NAME"] = "Confound"
    process.env["CONFOUND_AGE"] = "1"

    const configSource: ConfigValueSource<MyConfig> = obj<MyConfig>({
      name: envOrDie("CONFOUND_NAME"),
      nested: obj({
        age: envOrDie("CONFOUND_AGE").map(parseInt)
      })
    })
    const config = await configSource()
    expect(config).toEqual({
      name: "Confound",
      nested: {
        age: 1
      }
    })
  })
  it("Should load Config from mixed config sources", async () => {
    process.env["CONFOUND_NAME"] = "Confound"
    process.env["CONFOUND_AGE"] = "1"
    process.env["CONFOUND_ID"] = "abcde"

    const configSource: ConfigValueSource<MyConfig> = obj<MyConfig>({
      name: envOrDie("CONFOUND_NAME"),
      nested: {
        id: env("CONFOUND_ID"),
        age: 1
      }
    })
    const config = await configSource()
    expect(config).toEqual({
      name: "Confound",
      nested: {
        id: "abcde",
        age: 1
      }
    })
  })
  it("Should blow up on missing env variable", async () => {
    process.env["CONFOUND_NAME"] = "Confound"
    const configSource: ConfigValueSource<MyConfig> = obj<MyConfig>({
      name: envOrDie("CONFOUND_NAME"),
      nested: obj({
        age: envOrDie("CONFOUND_AGE").map(s => parseInt(s))
      })
    })
    const config = configSource()
    await expect(config).rejects.toEqual("Config load error: Expected env var CONFOUND_AGE")
  })
  it("Should handle literal array types", async () => {
    interface ArrayConfig {
      bootstrapServers: string[]
    }
    const configSource: ConfigValueSource<ArrayConfig> =
      ConfigValueSources.obj<ArrayConfig>({
        bootstrapServers: ["localhost:9092", "localhost:9092"],
      })
    const config: ArrayConfig = await configSource()
    expect(config).toEqual({
      bootstrapServers: ["localhost:9092", "localhost:9092"]
    })
  })
  it("Should handle sources array types", async () => {
    process.env["CONFOUND_BOOTSTRAP_SERVER_1"] = "localhost:9092"
    process.env["CONFOUND_BOOTSTRAP_SERVER_2"] = "localhost:9093"
    interface ArrayConfig {
      bootstrapServers: string[]
    }
    const configSource: ConfigValueSource<ArrayConfig> =
      ConfigValueSources.obj<ArrayConfig>({
        bootstrapServers: [
          envOrDie("CONFOUND_BOOTSTRAP_SERVER_1"),
          envOrDie("CONFOUND_BOOTSTRAP_SERVER_2"),
          envOr("CONFOUND_BOOTSTRAP_SERVER_3", "localhost:9094")
        ],
      })
    const config: ArrayConfig = await configSource()
    expect(config).toEqual({
      bootstrapServers: ["localhost:9092", "localhost:9093", "localhost:9094"]
    })
  })
})

