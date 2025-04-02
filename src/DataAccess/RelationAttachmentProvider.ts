import {PlainObject} from "@nightmaregaurav/ts-utility-types";
import ClassSpecification from "../Specification/ClassSpecification";
import Repository from "./Repository";
import ClassSpecificationRegistry from "../Specification/ClassSpecificationRegistry";
import DataDriver from "../DataDriver/DataDriver";
import {Shadow} from "../Shadow";

/** @internal */
export default class RelationAttachmentProvider {
  /**
   * Attaches relational properties to the data.
   * @param data The data to attach the relational properties to.
   * @param classSpecification The class specification of the data.
   * @param includeContext The include context to use for attaching the relational properties.
   * @returns The data with the relational properties attached.
   * @throws Error if an invalid include key is provided.
   * @internal
   */
  static async attachIncludesAndGet<T extends PlainObject>(
    data: T,
    classSpecification: ClassSpecification<T>,
    includeContext: PlainObject
  ): Promise<T> {
    const relationalProperties = classSpecification.relationalProperties;
    const attachedData: PlainObject = Shadow.for(data, classSpecification.relationalProperties.map(x => x.name));
    for(const includeKey in includeContext){
      const relationalProperty = relationalProperties
        .find(x => x.name === includeKey);
      if (!relationalProperty){
        throw new Error(
          `Invalid include key: ${includeKey}.` +
          `No such relational property found in class: ${classSpecification.class.name}`
        );
      }
      const relationalPropertyRepository = new Repository(
        relationalProperty.class
      );
      const isRelationalPropertyAList = relationalProperty.isCollection;
      if(isRelationalPropertyAList){
        const relationalClassSpecification =
          ClassSpecificationRegistry.getSpecificationFor(
            relationalProperty.class
          );
        const relatedTableName = relationalClassSpecification.tableName;
        const currentTableName = classSpecification.tableName;
        const relatedPropertyIdPropertyName = relationalProperty.correspondingIdentifierProperty;
        const relatedPropertyId = data[classSpecification.identifierProperty];
        const idsToFetch = await DataDriver.getRelationIndex(
          currentTableName,
          relatedTableName,
          relatedPropertyIdPropertyName,
          relatedPropertyId
        );
        attachedData[includeKey] = await relationalPropertyRepository
          .getQueryable()
          .injectIncludeMap(includeContext[includeKey])
          .getByIds(idsToFetch || []);
      }
      if(!isRelationalPropertyAList){
        const relatedPropertyIdIsMissing = Object.keys(data).indexOf(
          relationalProperty.correspondingIdentifierProperty
        ) === -1;
        if (relatedPropertyIdIsMissing){
          continue;
        }
        const relatedPropertyId = data[relationalProperty.correspondingIdentifierProperty];
        if (!relatedPropertyId){
          attachedData[includeKey] = null;
        } else {
          attachedData[includeKey] = await relationalPropertyRepository
            .getQueryable()
            .injectIncludeMap(includeContext[includeKey])
            ._getById(relatedPropertyId, true);
        }
      }
    }
    return attachedData as T;
  }
}