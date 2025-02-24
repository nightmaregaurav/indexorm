import {PlainObject} from "@nightmaregaurav/ts-utility-types";
import DataDriver from "../DataDriver/DataDriver";
import ClassSpecification from "../Specification/ClassSpecification";
import {EntityIdentifierType, NonRelationalPropertiesIn} from "../types";
import Queryable from "./Queryable";
import RelationAttachmentProvider from "./RelationAttachmentProvider";
import {Condition} from "./Condition";

/** A class that allows for querying data with conditions.
 *  @typeparam T The type of data to query.
 */
export default class ConditionalQueryable<T extends PlainObject> {
  /** The conditions to apply to the query.
   * @private
   */
  private conditions: Condition<T, NonRelationalPropertiesIn<T>>[] = [];

  constructor(private classSpecification: ClassSpecification<T>, private sourceQueryable: Queryable<T>){}
  
  /** Adds a condition to the query.
   * @param key The key of the data to filter.
   * @param predicate The test to apply to the data to determine if it should be included in the result.
   * @returns The current queryable object.
   * @throws Error if the key is a relational property.
   */
  where<K extends NonRelationalPropertiesIn<T>>(
    key: K,
    predicate: (value: T[K]) => boolean
  ): ConditionalQueryable<T> {
    const keyIsRelationalProperty = this.classSpecification.relationalProperties
      .some(x => x.name === key);
    if (keyIsRelationalProperty){
      throw new Error(
        'Where clause is not supported on relational properties yet. ' +
        `Cannot apply where clause on property: ${key as string}`
      );
    }
    this.conditions.push({
      key: key as NonRelationalPropertiesIn<T>,
      test: predicate as T[NonRelationalPropertiesIn<T>]
    });
    
    return this;
  }

  /** Checks if the conditions are met for a given index.
   * @param index The index to check the conditions against.
   * @returns True if the conditions are met, otherwise false.
   * @private
   */
  private async _checkConditionByIndex(index: EntityIdentifierType): Promise<boolean> {
    for (const condition of this.conditions){
      const dataKeyForProperty = DataDriver.getDataKey(
        this.classSpecification.tableName,
        index,
        condition.key as string
      );
      const propertyValue = await DataDriver
        .instance
        .read<T[NonRelationalPropertiesIn<T>]>(dataKeyForProperty);
      if (!condition.test(propertyValue)){
        return false;
      }
    }
    return true;
  }
  
  /** Selects the specified properties from the data source.
   * @param keys The keys of the properties to select.
   * @returns The selected properties from the data source that meet the conditions.
   * @remarks Relational properties are included in the result only if the related identifier is in the select and the include method is called.
   */
  async select(
    ...keys: (NonRelationalPropertiesIn<T>)[]
  ): Promise<Partial<T>[]> {
    const indexes = await DataDriver.getTableIndex(this.classSpecification.tableName);
    const result: T[] = [];
    for(const index of indexes) {
      const passesConditions = await this._checkConditionByIndex(index);
      if (!passesConditions) {
        continue;
      }
      const data: PlainObject = {} as PlainObject;
      
      for (const key of keys) {
        const dataKeyForProperty = DataDriver.getDataKey(
          this.classSpecification.tableName,
          index,
          key as string
        );
        data[key as string] = await DataDriver
          .instance
          .read<T[NonRelationalPropertiesIn<T>]>(dataKeyForProperty);
      }
      result.push(data as T);
    }
    
    const attachedObjects: Partial<T>[] = [];
    for(const data of result){
      const attachedData = await RelationAttachmentProvider.attachIncludesAndGet(
        data,
        this.classSpecification,
        this.sourceQueryable.includeMap
      )
      attachedObjects.push(attachedData);
    }
    return attachedObjects;
  }

  /** Gets all the data from the data source that meets the conditions.
   * @returns All the data from the data source that meets the conditions.
   */
  async getAll() {
    const indexes = await DataDriver.getTableIndex(this.classSpecification.tableName);
    const passingIndexes = indexes.filter(async index => {
      return await this._checkConditionByIndex(index);
    });
    const result: T[] = [];
    for(const id of passingIndexes){
      const data = await this.sourceQueryable._getById(id, true);
      result.push(data);
    }
    return result;
  }

  /** Gets the first data from the data source that meets the conditions.
   * @returns The first data from the data source that meets the conditions.
   */
  async first() {
    const indexes = await DataDriver.getTableIndex(this.classSpecification.tableName);
    for(const index of indexes){
      const passesConditions = await this._checkConditionByIndex(index);
      if (passesConditions){
        return this.sourceQueryable._getById(index, true);
      }
    }
    return null;
  }

  /** Gets the single data from the data source that meets the conditions.
   * @returns The single data from the data source that meets the conditions.
   * @throws Error if more than one record is found.
   * @throws Error if no record is found.
   */
  async single() {
    const indexes = await DataDriver.getTableIndex(this.classSpecification.tableName);
    let passingIndexes = indexes.filter(async index => {
      return await this._checkConditionByIndex(index);
    });
    
    if (passingIndexes.length > 1){
      throw new Error("More than one record found while expecting exactly one");
    }
    
    if (passingIndexes.length === 0){
      throw new Error("No record found while expecting exactly one");
    }
    
    return this.sourceQueryable._getById(passingIndexes[0], true);
  }

  /** Gets the count of the data from the data source that meets the conditions.
   * @returns The count of the data from the data source that meets the conditions.
   */
  async count() {
    const indexes = await DataDriver.getTableIndex(this.classSpecification.tableName);
    const passingIndexes = indexes.filter(async index => {
      return await this._checkConditionByIndex(index);
    });
    return passingIndexes.length;
  }
  
  /** Checks if any data from the data source meets the conditions.
   * @returns True if any data from the data source meets the conditions, otherwise false.
   * @remarks This method stops checking conditions as soon as it finds a record that meets the conditions.
   */
  async any() {
    const indexes = await DataDriver.getTableIndex(this.classSpecification.tableName);
    for(const index of indexes){
      const passesConditions = await this._checkConditionByIndex(index);
      if (passesConditions){
        return true;
      }
    }
    return false;
  }
}