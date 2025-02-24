import { PlainObject } from "@nightmaregaurav/ts-utility-types";
import IDriver from "./IDriver";

export default class SessionStorageDriver implements IDriver {
  keyPrefix = "indexorm::";
  
  public async write(key: string, value: any): Promise<boolean> {
    return new Promise((resolve: (value: boolean) => void, reject: (error: any) => void) => {
      try {
        sessionStorage.setItem(this.keyPrefix + key, value ? JSON.stringify(value) : "");
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async read(key: string): Promise<any> {
    return new Promise((resolve: (value: any) => void, reject: (error: any) => void) => {
      try {
        const value = sessionStorage.getItem(this.keyPrefix + key);
        resolve(value && value.length > 0 ? JSON.parse(value) : null);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async remove(key: string): Promise<boolean> {
    return new Promise((resolve: (value: boolean) => void, reject: (error: any) => void) => {
      try {
        sessionStorage.removeItem(this.keyPrefix + key);
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async dumpAll(): Promise<PlainObject> {
    return new Promise((resolve: (value: PlainObject) => void, reject: (error: any) => void) => {
      try {
        const data: PlainObject = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(this.keyPrefix)) {
            const value = sessionStorage.getItem(key);
            if (value) {
              data[key] = value;
            }
          }
        }
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  public async loadAll(data: PlainObject): Promise<boolean> {
    return new Promise((resolve: (value: boolean) => void, reject: (error: any) => void) => {
      try {
        for (const key in data) {
          if (data.hasOwnProperty(key) && key.startsWith(this.keyPrefix)) {
            sessionStorage.setItem(key, data[key]);
          }
        }
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }
}