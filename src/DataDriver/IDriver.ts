import { PlainObject } from "@nightmaregaurav/ts-utility-types";

/** A driver that can read and write data to a data source. */
export default interface IDriver {
  /** Writes data to the data source.
   * @param key The key to write the data to.
   * @param value The data to write.
   * @returns True if the data was written successfully, otherwise false.
   */
  write<T>(key: string, value: T): Promise<boolean>;
  
  /** Reads data from the data source.
   * @param key The key to read the data from.
   * @returns The data that was read.
   */
  read<T>(key: string): Promise<T>;
  
  /** Removes data from the data source.
   * @param key The key to remove the data from.
   * @returns True if the data was removed successfully, otherwise false.
   */
  remove(key: string): Promise<boolean>;
  
  /** Gets all data from the data source.
   * @returns All data from the data source.
   */
  dumpAll(): Promise<PlainObject>;

  /** Loads all data into the data source.
   * @param data The data to load into the data source.
   * @returns True if the data was loaded successfully, otherwise false.
   */
  loadAll(data: PlainObject): Promise<boolean>;
}