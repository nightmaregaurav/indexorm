import { PlainObject } from "@nightmaregaurav/ts-utility-types";
import {EntityIdentifierType, GetKeyFlatTypeFor, NonRelationalPropertiesIn, RelationalPropertiesIn} from "../types";
import ClassSpecification from "../Specification/ClassSpecification";
import DataDriver from "../DataDriver/DataDriver";
import ConditionalQueryable from "./ConditionalQueryable";
import RelationAttachmentProvider from "./RelationAttachmentProvider";

/** A class that allows for querying data.
 *  @typeparam Root The type of the data to query.
 *  @typeparam Current The type of the data being pointed to by the include method.
 */
export default class Queryable<Root extends PlainObject, Current extends PlainObject = Root> {
  /** 
   * A map of includes to be used in the query.
   * @internal
   */
  includeMap: PlainObject = {};

  /**
   * The current include pointer.
   * @internal
   */
  private currentIncludePointer: string = "";
  
  constructor(private rootClassSpecification: ClassSpecification<Root>) {}

  /**
   * Injects the current include pointer.
   * @param currentIncludePointer The current include pointer.
   * @returns The current queryable object.
   * @internal
   */
  injectCurrentIncludePointer(currentIncludePointer: string) {
    this.currentIncludePointer = currentIncludePointer;
    return this;
  }

  /**
   * Injects the include map.
   * @param includeMap The include map.
   * @returns The current queryable object.
   * @internal
   */
  injectIncludeMap(includeMap: PlainObject) {
    this.includeMap = includeMap;
    return this;
  }

  /**
   * Includes a relational property in the query.
   * @param key The key of the relational property to include.
   * @returns A thenInclude-able queryable object that includes the relational property.
   */
  include<K extends RelationalPropertiesIn<Root>>(
    key: K
  ): Queryable<Root, GetKeyFlatTypeFor<Root, K>> {
    if (this.includeMap[key as string] === undefined){
      this.includeMap[key as string] = {};
    }
    this.currentIncludePointer = key as string;

    const query = new Queryable<Root, GetKeyFlatTypeFor<Root, K>>(this.rootClassSpecification);
    query.injectCurrentIncludePointer(this.currentIncludePointer);
    query.injectIncludeMap(this.includeMap);
    return query;
  }

  /**
   * Includes a relational property in the query.
   * @param key The key of the relational property to include.
   * @returns A thenInclude-able queryable object that includes the relational property.
   * @throws Error if include is called before calling include.
   * @throws Error if include map context is corrupted.
   * @remarks This method is supposed to be called after calling include.
   */
  thenInclude<K extends RelationalPropertiesIn<Current>>(
    key: K
  ): Queryable<Root, GetKeyFlatTypeFor<Current, K>> {
    if (this.currentIncludePointer === ""){
      throw new Error("Cannot call thenInclude without calling include first.");
    }

    const currentIncludePointer = this.currentIncludePointer;
    const currentIncludePath = currentIncludePointer.split("::");

    let includeMapContext: PlainObject = {};
    for(const includePath of currentIncludePath){
      includeMapContext = this.includeMap[includePath];
      if (this.includeMap[includePath] === undefined){
        throw new Error("Something went wrong while fetching include map context.");
      }
      includeMapContext = this.includeMap[includePath];
    }

    if (includeMapContext[key as string] === undefined){
      includeMapContext[key as string] = {};
    }

    this.currentIncludePointer = currentIncludePointer + "::" + (key as string);

    const query = new Queryable<Root, GetKeyFlatTypeFor<Current, K>>(this.rootClassSpecification);
    query.injectCurrentIncludePointer(this.currentIncludePointer);
    query.injectIncludeMap(this.includeMap);
    return query;
  }

  /** 
   * Gets the data by id.
   * @param id The id of the data to get.
   * @returns The data with the specified id.
   * @throws Error if no data is found for the id.
   */
  async getById(id: EntityIdentifierType) : Promise<Root>{
    return this._getById(id);
  }

  /**
   * Gets the data by ids.
   * @param id The ids of the data to get.
   * @param skipIndexCheck Whether to skip the index check.
   * @returns The data with the specified ids.
   * @throws Error if not skipping index check and the id is not found.
   * @internal
   */
  async _getById(id: EntityIdentifierType, skipIndexCheck: boolean = false) : Promise<Root> {
    if (!skipIndexCheck){
      const indexes = await DataDriver.getTableIndex(this.rootClassSpecification.tableName);
      if (!indexes.includes(id)){
        throw new Error(
          `No data found for id: ${id}. ` + 
          `${this.rootClassSpecification.tableName} does not ` + 
          `contain row with property ${this.rootClassSpecification.identifierProperty} having value ${id}`
        );
      }
    }
    const properties = this.rootClassSpecification.nonRelationalProperties;
    const data: Root = {} as Root;
    for (const property of properties) {
      const dataKey = DataDriver.getDataKey(
        this.rootClassSpecification.tableName,
        id,
        property
      );
      const propertyValue = await DataDriver.instance.read<Root>(dataKey);
      if (!propertyValue){
        continue;
      }
      const dataToAssign = {[property]: propertyValue};
      Object.assign(data, dataToAssign);
    }
    return RelationAttachmentProvider.attachIncludesAndGet(
      data,
      this.rootClassSpecification,
      this.includeMap
    );
  }

  /**
   * Gets the data by ids.
   * @param ids The ids of the data to get.
   * @returns The data with the specified ids.
   * @throws Error if one or more ids are not found.
   */
  async getByIds(ids: EntityIdentifierType[]) : Promise<Root[]>{
    const indexes = await DataDriver.getTableIndex(this.rootClassSpecification.tableName);
    const indexHasMissingIds = ids.some(id => !indexes.includes(id));
    if (indexHasMissingIds){
      throw new Error(
        `One or more ids are missing in table: ${this.rootClassSpecification.tableName}`
      );
    }
    const result: Root[] = [];
    for(const id of ids){
      const data = await this._getById(id, true);
      result.push(data);
    }
    return result;
  }

  /**
   * Gets all the data from the data source.
   * @returns All the data from the data source.
   */
  async getAll(): Promise<Root[]> {
    const indexes = await DataDriver.getTableIndex(this.rootClassSpecification.tableName);
    const result: Root[] = [];
    for(const index of indexes){
      const data = await this._getById(index, true);
      result.push(data);
    }
    return result;
  }
  
  /**
   * Selects the data that meets the condition.
   * @param key The keys of the properties to select.
   * @param predicate The condition to apply to the data.
   * @returns A conditional queryable object that selects the data that meets the condition.
   */
  where<K extends NonRelationalPropertiesIn<Root>>(
    key: K,
    predicate: (value: Root[K]) => boolean
  ): ConditionalQueryable<Root> {
    return new ConditionalQueryable<Root>(
      this.rootClassSpecification,
      this
    ).where(key, predicate);
  }
}