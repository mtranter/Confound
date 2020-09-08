export type ConfigFor<T> = { [k in keyof T]: ConfigValueSource<T[k]> | T[k] | ConfigFor<T[k]> }

export type ConfigFetcher<T> = () => Promise<T>

export type ConfigValueSource<T> = ConfigFetcher<T> & {
  map: <S>(f: (t: T) => S | Promise<S>) => ConfigValueSource<S>
  flatMap: <S>(f: (t: T) => ConfigValueSource<S>) => ConfigValueSource<S>
}

const configValueSource: <T>(cf: ConfigFetcher<T>) => ConfigValueSource<T> = <T>(cf: ConfigFetcher<T>) => Object.assign(() => cf(), {
  map: <S>(f: (t: T) => S | Promise<S>): ConfigValueSource<S> => configValueSource<S>(() => cf().then(f)),
  flatMap: <S>(f: (t: T) => ConfigValueSource<S>): ConfigValueSource<S> => configValueSource<S>(() => cf().then(r => f(r)()))
})

interface ConfigValueSources {
  of: <T>(cf: () => Promise<T>) => ConfigValueSource<T>
  lit: <T>(t: T | Promise<T>) => ConfigValueSource<T>
  env: (n: string) => ConfigValueSource<string | undefined>
  or: <T>(cvs: ConfigValueSource<T | undefined>, defaultVal: T) => ConfigValueSource<T>
  orDie: <T>(cvs: ConfigValueSource<T | undefined>, failureMsg: string) => ConfigValueSource<T>
  envOr: (e: string, defaultVal: string) => ConfigValueSource<string>
  envOrDie: (e: string) => ConfigValueSource<string>
  obj: <T>(config: ConfigFor<T>) => ConfigValueSource<T>
}

export const ConfigValueSources: ConfigValueSources = {
  of: <T>(cf: () => Promise<T>) => configValueSource(cf),
  lit: <T>(t: T | Promise<T>) => configValueSource(() => Promise.resolve(t)),
  env: (n: string) => configValueSource(() => Promise.resolve(process.env[n])),
  or: <T>(cvs: ConfigValueSource<T | undefined>, defaultVal: T) => cvs.map(s => s ? Promise.resolve(s) : Promise.resolve<T>(defaultVal)),
  orDie: <T>(cvs: ConfigValueSource<T | undefined>, failureMsg: string) => cvs.map(s => s ? Promise.resolve(s) : Promise.reject<T>(failureMsg)),
  envOr: (e: string, defaultVal: string) => ConfigValueSources.or(ConfigValueSources.env(e), defaultVal),
  envOrDie: (e: string) => ConfigValueSources.orDie(ConfigValueSources.env(e), `Config load error: Expected env var ${e}`),
  obj: <T>(config: ConfigFor<T>) => {
    const configAny = config as { [k: string]: ConfigValueSource<any> }
    const getValue = (src: any): Promise<any> =>
      src instanceof Function ? src() :
        (Object.getPrototypeOf(src) === Object.getPrototypeOf({})) ? ConfigValueSources.obj(src)() :
          Array.isArray(src) ? Promise.all(src.map(getValue)) :
            Promise.resolve(src)
    const fetchedP = Object.keys(config).reduce((p, n) => ([...p, getValue(configAny[n]).then((v: any) => ({ [n]: v }))]), [] as Array<Promise<any>>)
    const result = Promise.all(fetchedP).then(fetched => {
      return fetched.reduce((p, n) => Object.assign({}, p, n), {})
    })

    return ConfigValueSources.lit(result as Promise<T>)
  }
}

