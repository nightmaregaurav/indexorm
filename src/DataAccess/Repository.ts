import { Class, PlainObject } from "@nightmaregaurav/ts-utility-types";
import { EntityIdentifierType, RelationalClassesIn } from "../types";
import Queryable from "./Queryable";
import ClassSpecification from "../Specification/ClassSpecification";
import ClassSpecificationRegistry from "../Specification/ClassSpecificationRegistry";
import DataDriver from "../DataDriver/DataDriver";

/** A repository that allows for CRUD operations on entities.
 *  @typeparam T The type of the entity to perform operations on.
 */
export default class Repository<T extends PlainObject> {
  /** The class specification for the entity type. */
  private readonly classSpecification: ClassSpecification<T>;

  constructor(_class: Class<T>) {
    this.classSpecification = ClassSpecificationRegistry.getSpecificationFor(_class);
  }

  /** Creates or updates an entity.
   * @param instance The entity to create or update.
   * @returns The identifier of the entity.
   * @private
   */
  private async createOrUpdate(instance: T): Promise<EntityIdentifierType> {
    const tableName = this.classSpecification.tableName;
    const index = await DataDriver.getTableIndex(tableName);
    const identifierProperty = this.classSpecification.identifierProperty;
    const identifierValue = instance[identifierProperty] as EntityIdentifierType;
    if (index.includes(identifierValue)) {
      await this.update(instance);
      return identifierValue;
    }
    return this.create(instance);
  }

  /** Creates an entity.
   * @param instance The entity to create.
   * @returns The identifier of the entity.
   */
  public async create(instance: T): Promise<EntityIdentifierType> {
    const tableName = this.classSpecification.tableName;
    const identifierProperty = this.classSpecification.identifierProperty;
    const identifierValue = instance[identifierProperty] as EntityIdentifierType;
    
    await this.handleRelationalProperties(instance, identifierValue);
    await DataDriver.addTableIndex(tableName, identifierValue);
    
    const properties = this.classSpecification.nonRelationalProperties;
    for (const property of properties) {
      const dataKey = DataDriver.getDataKey(tableName, identifierValue, property);
      let dataToStore = instance[property];
      if (instance[property] === undefined) {
        dataToStore = null;
      }
      await DataDriver.instance.write(dataKey, dataToStore);
    }

    return identifierValue;
  }

  /** Gets a queryable object for the entity type.
   * @returns A queryable object for the entity type.
   */
  public getQueryable(): Queryable<T, T> {
    return new Queryable<T, T>(this.classSpecification);
  }

  /** Updates an entity.
   * @param instance The entity to update.
   * @returns A promise that resolves when the entity is updated.
   */
  public async update(instance: T): Promise<void> {
    const tableName = this.classSpecification.tableName;
    const identifierProperty = this.classSpecification.identifierProperty;
    const identifierValue = instance[identifierProperty] as EntityIdentifierType;
    
    await this.handleRelationalProperties(instance, identifierValue);

    const properties = this.classSpecification.nonRelationalProperties;
    for (const property of properties) {
      const dataKey = DataDriver.getDataKey(tableName, identifierValue, property);
      let dataToStore = instance[property];
      if (instance[property] === undefined) {
        dataToStore = null;
      }
      await DataDriver.instance.write(dataKey, dataToStore);
    }
  }

  /** Deletes an entity.
   * @param instance The entity to delete.
   * @returns A promise that resolves when the entity is deleted.
   */
  public async delete(instance: T): Promise<void> {
    const tableName = this.classSpecification.tableName;
    const index = await DataDriver.getTableIndex(tableName);
    const identifierProperty = this.classSpecification.identifierProperty;
    const identifierValue = instance[identifierProperty] as EntityIdentifierType;
    if (!index.includes(identifierValue)) {
      return;
    }
    
    await DataDriver.removeTableIndex(tableName, identifierValue);
    
    const properties = this.classSpecification.nonRelationalProperties;
    for (const property of properties) {
      const dataKey = DataDriver.getDataKey(tableName, identifierValue, property);
      await DataDriver.instance.remove(dataKey);
    }

    for (const relationalProperty of this.classSpecification.relationalProperties) {
      const relatedClassSpecification = ClassSpecificationRegistry.getSpecificationFor(relationalProperty.class);
      const relatedTableName = relatedClassSpecification.tableName;
      const relatedPropertyIdName = relationalProperty.correspondingIdentifierProperty;
      if (!relationalProperty.isCollection) {
        const identifierOfRelatedTable = 
          instance[relationalProperty.correspondingIdentifierProperty] as EntityIdentifierType;
        await DataDriver.removeRelationIndex(
          relatedTableName,
          tableName,
          relatedPropertyIdName,
          identifierOfRelatedTable,
          identifierValue
        );
      }
      else {
        await DataDriver.removeRelationIndexRecord(
          tableName,
          relatedTableName,
          relationalProperty.correspondingIdentifierProperty,
          identifierValue
        );
      }
    }
  }
  
  /** Handles the relation management of the properties of an entity.
   * @param instance The entity to handle the relational properties for.
   * @param identifier The identifier of the entity.
   * @returns A promise that resolves when the relational properties are handled.
   * @private
   */
  private async handleRelationalProperties(instance: T, identifier: EntityIdentifierType): Promise<void> {
    for (const relationalProperty of this.classSpecification.relationalProperties) {
      if (!relationalProperty.isCollection) {
        const relatedClassSpecification = ClassSpecificationRegistry
          .getSpecificationFor(relationalProperty.class);
        const nameOnSource = relationalProperty.name;
        const relatedData = instance[nameOnSource];
        let idOnSource = instance[relationalProperty.correspondingIdentifierProperty] as EntityIdentifierType;
        if (relatedData) {
          if (!idOnSource) {
            idOnSource = relatedData[relatedClassSpecification.identifierProperty];
            Object.assign(instance, {[relationalProperty.correspondingIdentifierProperty]: idOnSource});
          }
          const relationalRepository = new Repository(relationalProperty.class);
          await relationalRepository.createOrUpdate(relatedData);
        }
        
        const relatedTableName = relatedClassSpecification.tableName;
        const relatedIdNameOnSource = relationalProperty.correspondingIdentifierProperty;
        await DataDriver.addRelationIndex(
          relatedTableName,
          this.classSpecification.tableName,
          relatedIdNameOnSource,
          idOnSource,
          identifier
        );
      } else {
        const relatedDataList = instance[relationalProperty.name] as RelationalClassesIn<T>[];
        if (!relatedDataList || relatedDataList.length === 0) {
          continue;
        }
        const relationalRepository = new Repository(relationalProperty.class);
        for (const relatedData of relatedDataList) {
          const idOfSource = instance[this.classSpecification.identifierProperty] as RelationalClassesIn<T>[string]
          const sourceIdPropertyNameOnRelatedTable = relationalProperty.correspondingIdentifierProperty;
          relatedData[sourceIdPropertyNameOnRelatedTable] = idOfSource;
          await relationalRepository.createOrUpdate(relatedData);
        }
      }
    }
  }
}