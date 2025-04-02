export class Shadow {
  public static for<T extends {}>(
    source: T,
    navigationalProperties: (keyof T)[]
  ){
    return new ShadowFactory<T>(source, navigationalProperties).getInstance();
  }
}

class ShadowFactory<T extends {}> {
  private readonly source: T;
  private excludedNavigationalProperties: Set<keyof T>;
  
  constructor(
    source: T,
    navigationalProperties: (keyof T)[]
  ) {
    this.source = source;
    this.excludedNavigationalProperties = new Set(navigationalProperties);
  }

  getInstance(){
    return new Proxy(this.source, {
      get: (target, prop: string) => {
        if (this.excludedNavigationalProperties.has(prop as keyof T)) {
          throw new Error(`The property ${String(prop)} is not loaded yet. Lazy loading is not supported.`);
        }
        return target[prop as keyof T];
      },
      set: (target, prop: string, value: any) => {
        if (this.excludedNavigationalProperties.has(prop as keyof T)) {
          this.excludedNavigationalProperties.delete(prop as keyof T);
        }
        target[prop as keyof T] = value;
        return true;
      }
    });
  }
}