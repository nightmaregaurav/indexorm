import IDriver from "./IDriver";
import { EntityIdentifierType } from "../types";
import {ClassSpecificationRegistry} from "../../index";

/** A class that provides access to data driver functionality. */
export default class DataDriver {
  /** @internal */
  private static _instance: IDriver;
  
  /**
   * The instance of the data driver.
   * @internal
   */
  public static get instance(): IDriver {
    if (!DataDriver._instance) {
      throw new Error("DataDriver has not been set");
    }
    return DataDriver._instance;
  }

  /** Configures the data driver.
   * @param driver The data driver to use.
   */
  public static configure(driver: IDriver) {
    DataDriver._instance = driver;
  }

  /** Retrieves the key for the table index.
   * @param tableName The name of the table.
   * @returns The key for the table index.
   * @private
   */
  private static getTableIndexKey(tableName: string): string {
    return ':' +
      ':index-of:' +
      `:${tableName}-identifiers:` +
    ':';
  }
  
  /** Retrieves the key for the relation index.
   * @param destinationTableName The name of the destination table.
   * @param sourceTableName The name of the source table.
   * @param destinationIdPropertyNameOnSourceTable The name of the destination id property on the source table.
   * @param destinationIdOnSourceTable The id of the destination on the source table.
   * @returns The key for the relation index.
   * @private
   */
  private static getRelationIndexKey(
    destinationTableName: string,
    sourceTableName: string,
    destinationIdPropertyNameOnSourceTable: string,
    destinationIdOnSourceTable: EntityIdentifierType
  ): string {
    return ':' +
      ':index-of:' +
      `:${sourceTableName}-identifiers:` +
      ':which-has-one:' +
      `:${destinationTableName}:` +
      ':as:' +
      `:${destinationIdPropertyNameOnSourceTable}:` +
      ':with-identifier:' +
      `:${destinationIdOnSourceTable}:` +
    ':';
  }

  /** 
   * Retrieves the table index.
   * @param tableName The name of the table.
   * @returns The table index.
   * @internal
   */
  static async getTableIndex(tableName: string): Promise<EntityIdentifierType[]> {
    const indexKey = DataDriver.getTableIndexKey(tableName);
    const index = await DataDriver.instance.read<EntityIdentifierType[]>(indexKey);
    return index || [];
  }

  /**
   * Retrieves the relation index.
   * @param destinationTableName The name of the destination table.
   * @param sourceTableName The name of the source table.
   * @param destinationIdPropertyNameOnSourceTable The name of the destination id property on the source table.
   * @param destinationIdOnSourceTable The id of the destination on the source table.
   * @returns The relation index.
   * @internal
   */
  static async getRelationIndex(
    destinationTableName: string,
    sourceTableName: string,
    destinationIdPropertyNameOnSourceTable: string,
    destinationIdOnSourceTable: EntityIdentifierType,
  ): Promise<EntityIdentifierType[]> {
    const relationIndexKey = DataDriver.getRelationIndexKey(
      destinationTableName,
      sourceTableName,
      destinationIdPropertyNameOnSourceTable,
      destinationIdOnSourceTable
    );
    return await DataDriver.instance.read<EntityIdentifierType[]>(relationIndexKey);
  }

  /**
   * Adds an index to a table.
   * @param tableName The name of the table.
   * @param identifier The identifier to add to the table index.
   * @returns A promise that resolves when the index is added.
   * @throws Error if the identifier already exists in the table index.
   * @internal
   */
  static async addTableIndex(tableName: string, identifier: EntityIdentifierType): Promise<void> {
    const indexKey = DataDriver.getTableIndexKey(tableName);
    const index = await DataDriver.instance.read<EntityIdentifierType[]>(indexKey);
    if (!index) {
      await DataDriver.instance.write(indexKey, [identifier]);
      return;
    }
    if (index.includes(identifier)) {
      throw new Error(`Index constraint violation: ${identifier} already exists in table ${tableName}`);
    }
    index.push(identifier);
    await DataDriver.instance.write(indexKey, index);
  }

  /**
   * Adds a relation index.
   * @param destinationTableName The name of the destination table.
   * @param sourceTableName The name of the source table.
   * @param destinationIdPropertyNameOnSourceTable The name of the destination id property on the source table.
   * @param destinationIdOnSourceTable The id of the destination on the source table.
   * @param identifier The identifier to add to the relation index.
   * @returns A promise that resolves when the relation index is added.
   * @internal
   */
  static async addRelationIndex(
    destinationTableName: string,
    sourceTableName: string,
    destinationIdPropertyNameOnSourceTable: string,
    destinationIdOnSourceTable: EntityIdentifierType,
    identifier: EntityIdentifierType
  ): Promise<void> {
    const relationIndexKey = DataDriver.getRelationIndexKey(
      destinationTableName,
      sourceTableName,
      destinationIdPropertyNameOnSourceTable,
      destinationIdOnSourceTable
    );
    const relationIndex = await DataDriver.instance.read<EntityIdentifierType[]>(
      relationIndexKey
    );
    if (!relationIndex) {
      await DataDriver.instance.write(relationIndexKey, [identifier]);
      return;
    }
    if (relationIndex.includes(identifier)) {
      return;
    }
    relationIndex.push(identifier);
    await DataDriver.instance.write(relationIndexKey, relationIndex);
  }

  /**
   * Removes an index from a table.
   * @param tableName The name of the table.
   * @param identifier The identifier to remove from the table index.
   * @returns A promise that resolves when the index is removed.
   * @internal
   */
  static async removeTableIndex(tableName: string, identifier: EntityIdentifierType): Promise<void> {
    const indexKey = DataDriver.getTableIndexKey(tableName);
    const index = await DataDriver.instance.read<EntityIdentifierType[]>(indexKey);
    if (!index) {
      return;
    }
    const newIndex = index.filter(x => x !== identifier);
    await DataDriver.instance.write(indexKey, newIndex);
  }

  /** 
   * Removes a relation index.
   * @param destinationTableName The name of the destination table.
   * @param sourceTableName The name of the source table.
   * @param destinationIdPropertyNameOnSourceTable The name of the destination id property on the source table.
   * @param destinationIdOnSourceTable The id of the destination on the source table.
   * @param identifier The identifier to remove from the relation index.
   * @returns A promise that resolves when the relation index is removed.
   * @internal
   */
  static async removeRelationIndex(
    destinationTableName: string,
    sourceTableName: string,
    destinationIdPropertyNameOnSourceTable: string,
    destinationIdOnSourceTable: EntityIdentifierType,
    identifier: EntityIdentifierType
  ): Promise<void> {
    const relationIndexKey = DataDriver.getRelationIndexKey(
      destinationTableName,
      sourceTableName,
      destinationIdPropertyNameOnSourceTable,
      destinationIdOnSourceTable
    );
    const relationIndex = await DataDriver.instance.read<EntityIdentifierType[]>(relationIndexKey);
    if (!relationIndex) {
      return;
    }
    const newRelationIndex = relationIndex.filter(x => x !== identifier);
    await DataDriver.instance.write(relationIndexKey, newRelationIndex);
  }

  /**
   * Removes the entire relation index record.
   * @param destinationTableName The name of the destination table.
   * @param sourceTableName The name of the source table.
   * @param destinationIdPropertyNameOnSourceTable The name of the destination id property on the source table.
   * @param destinationIdOnSourceTable The id of the destination on the source table.
   * @returns A promise that resolves when the relation index record is removed.
   * @internal
   */
  static async removeRelationIndexRecord(
    destinationTableName: string,
    sourceTableName: string,
    destinationIdPropertyNameOnSourceTable: string,
    destinationIdOnSourceTable: EntityIdentifierType
  ): Promise<void> {
    const relationIndexKey = DataDriver.getRelationIndexKey(
      destinationTableName,
      sourceTableName,
      destinationIdPropertyNameOnSourceTable,
      destinationIdOnSourceTable
    );
    await DataDriver.instance.remove(relationIndexKey);
  }

  /**
   * Gets the key that points to the data for given entity, index, and column.
   * @param tableName The name of the table.
   * @param index The index of the entity.
   * @param columnName The name of the column.
   * @returns The key that points to the data for given entity, index, and column.
   * @throws Error if the table name is not found in the class specification registry.
   * @throws Error if the column name is not found in the class specification registry.
   * @internal
   */
  static getDataKey(tableName: string, index: EntityIdentifierType, columnName: string): string {
    const classSpecification = ClassSpecificationRegistry.getSpecificationByTableName(tableName);
    if (!classSpecification) {
      throw new Error(`No class specification found for table name: ${tableName}`);
    }
    const nonRelationalProperties = classSpecification.nonRelationalProperties;
    if (!nonRelationalProperties.includes(columnName)) {
      throw new Error(`Column ${columnName} not found in table ${tableName}`);
    }
    return `${tableName}:${index}:${columnName};`;
  }
}