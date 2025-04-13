import ClassSpecification from "./ClassSpecification";
import {Class, PlainObject} from "@nightmaregaurav/ts-utility-types";
import {
  CollectionRelationalPropertiesIn,
  NonRelationalPropertiesIn,
  PotentialEntityIdentifierIn,
  PotentialRelationalEntityIdentifierIn,
  SingularRelationalPropertiesIn
} from "../types";

/** A builder to create a class specification for a class.
 * @typeparam T The type of the class to create a specification for. 
 */
export default class ClassSpecificationBuilder<T extends PlainObject> {
  /** The specification being built.
   * @internal 
   */
  private readonly specification: ClassSpecification<T> = new ClassSpecification<T>();
  
  /** Whether the table name has been manually set.
   * @internal
   */
  private isNameManuallySet: boolean = false;

  constructor(_class: Class<T>) {
    this.specification.class = _class;
    this.specification.tableName = _class.name;
    this.specification.relationalProperties = [];
    this.specification.nonRelationalProperties = [];
  }

  /** Sets the table name for the entity.
   * @param tableName The name of the table to set.
   * @returns This instance of the builder.
   * @throws An error if the table name has already been set manually.
   * @remarks This method can be skipped if the table name is the same as the class name.
   */
  public as(tableName: string): ClassSpecificationBuilder<T> {
    if (this.isNameManuallySet) {
      throw new Error("Cannot set the table name more than once.");
    }
    this.specification.tableName = tableName;
    this.isNameManuallySet = true;
    return this;
  }

  /** Sets the identifier for the entity.
   * @param identifier The property to use as the identifier.
   * @returns This instance of the builder.
   * @throws An error if the identifier has already been set.
   */
  public hasIdentifier(identifier: PotentialEntityIdentifierIn<T>): ClassSpecificationBuilder<T> {
    if (this.specification.identifierProperty) {
      throw new Error("Cannot set multiple identifiers for the entity " + this.specification.class.name);
    }
    this.specification.identifierProperty = identifier as string;
    this.specification.nonRelationalProperties.push(identifier as string);
    return this;
  }
  
  /** Registers a property as a non-relational property.
   * @param property The property to register.
   * @returns This instance of the builder.
   * @throws An error if the property has already been registered.
   * @remarks This method can be called multiple times to register multiple properties.
   * @remarks Properties that are not registered will not be saved or loaded from the data source.
   */
  public has(property: NonRelationalPropertiesIn<T>): ClassSpecificationBuilder<T> {
    const existingProperty = this.specification.nonRelationalProperties.find(x => x === property);
    if (existingProperty) {
      throw new Error(`Cannot register multiple properties with the same name: ${property as string}`);
    }
    this.specification.nonRelationalProperties.push(property as string);
    return this;
  }

  /** Registers a property as a relational property.
   * @param property The property to register.
   * @param relatedClass The class of the related entity.
   * @param correspondingIdentifierProperty The property in the related entity that corresponds to the identifier of the current entity.
   * @returns This instance of the builder.
   * @throws An error if the property has already been registered.
   * @remarks This method can be called multiple times to register multiple properties.
   * @remarks Related identifier is automatically registered as non-relational property while calling this method.
   */
  public hasOne<U extends SingularRelationalPropertiesIn<T>, TT extends T[U]>(
    property: U,
    relatedClass: Class<TT>,
    correspondingIdentifierProperty: PotentialRelationalEntityIdentifierIn<T>
  ): ClassSpecificationBuilder<T> {
    const existingProperty = this.specification.relationalProperties.find(x => x.name === property);
    if (existingProperty) {
      throw new Error(`Cannot register multiple relational properties with the same name: ${property as string}`);
    }
    this.specification.relationalProperties.push({
      name: property as string,
      class: relatedClass,
      correspondingIdentifierProperty: correspondingIdentifierProperty as string,
      isCollection: false
    });
    const idRegisteredAsNonRelational = this.specification.nonRelationalProperties.includes(
      correspondingIdentifierProperty as string
    );
    if (!idRegisteredAsNonRelational) {
      this.specification.nonRelationalProperties.push(correspondingIdentifierProperty as string);
    }
    return this;
  }

  /** Registers a property as a collection relational property.
   * @param property The property to register.
   * @param relatedClass The class of the related entity.
   * @param correspondingIdentifierProperty The property in the related entity that corresponds to the identifier of the current entity.
   * @returns This instance of the builder.
   * @throws An error if the property has already been registered.
   * @remarks This method can be called multiple times to register multiple properties.
   */
  public hasMany<U extends CollectionRelationalPropertiesIn<T>, TT extends T[U][0]>(
    property: U,
    relatedClass: Class<TT>,
    correspondingIdentifierProperty: PotentialRelationalEntityIdentifierIn<TT>
  ): ClassSpecificationBuilder<T> {
    const existingProperty = this.specification.relationalProperties.find(x => x.name === property);
    if (existingProperty) {
      throw new Error(`Cannot register multiple relational properties with the same name: ${property as string}`);
    }
    this.specification.relationalProperties.push({
      name: property as string,
      class: relatedClass,
      correspondingIdentifierProperty: correspondingIdentifierProperty as string,
      isCollection: true
    });
    return this;
  }

  /** Builds the specification.
   * @returns The specification that was built.
   * @throws An error if the specification does not have an identifier.
   */
  public build(): ClassSpecification<T> {
    if (!this.specification.identifierProperty) {
      throw new Error("Cannot create a specification without an identifier.");
    }
    return this.specification;
  }
}
