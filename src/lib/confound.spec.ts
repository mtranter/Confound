import { ConfigValueSource, ConfigValueSources } from './confound'

const { env, envOrDie, obj } = ConfigValueSources

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
    await expect(config).rejects.toEqual("Expected env var CONFOUND_AGE")
  })
})
