import {Class, PlainObject} from "@nightmaregaurav/ts-utility-types";
import ClassSpecification from "./ClassSpecification";

/** Registry for class specifications. */
export default class ClassSpecificationRegistry {
  /** Object to store class specifications */
  private static readonly specifications: PlainObject = {};
  
  /**
   * Registers a class specification.
   * @typeparam T - The type of the class.
   * @param specification - The class specification to register.
   * @throws Error if a class specification is already registered for the class or if a table is already mapped to a class.
   * @throws Error if no specification is table is already mapped to a class.
   */
  public static register<T extends PlainObject>(specification: ClassSpecification<T>): void {
    const existingSpecification = this.specifications[specification.class.name];
    if (existingSpecification) {
      throw new Error(
        `A Class Specification is already registered for the class ${existingSpecification.registeredClass.name} ` + 
        `as table ${existingSpecification.name}`
      );
    }
    const alreadyMapped = Object.values(this.specifications).find(
      (x: ClassSpecification<T>) => x.tableName === specification.tableName
    );
    if (alreadyMapped) {
      throw new Error(`Table ${specification.tableName} is already mapped to class ${alreadyMapped.class.name}`);
    }
    this.specifications[specification.class.name] = specification;
  }

  /**
   * Checks if a class specification is registered for a class.
   * @typeparam T - The type of the class.
   * @param _class - The class to check.
   * @returns True if a class specification is registered for the class, otherwise false.
   */
  public static isSpecificationRegisteredFor<T extends PlainObject>(_class: Class<T>): boolean {
    return !!this.specifications[_class.name];
  }

  /** 
   * Gets the class specification for a class.
   * @typeparam T - The type of the class.
   * @param _class - The class to get the specification for.
   * @returns The class specification for the class.
   * @throws Error if no specification is found for the class.
   * @internal
   */
  public static getSpecificationFor<T extends PlainObject>(_class: Class<T>): ClassSpecification<T> {
    if (!this.specifications[_class.name]) {
      throw new Error("No specification found for class " + _class.name);
    }
    return this.specifications[_class.name] as ClassSpecification<T>;
  }

  /**
   * Gets the class specification for a table.
   * @param tableName - The table name to get the specification for.
   * @returns The class specification for the table.
   * @throws Error if no specification is found for the table.
   * @internal
   */
  public static getSpecificationByTableName(tableName: string): ClassSpecification<PlainObject> {
    const specification = Object.values(this.specifications).find(
      (x: ClassSpecification<PlainObject>) => x.tableName === tableName
    );
    if (!specification) {
      throw new Error(`No specification found for table ${tableName}`);
    }
    return specification;
  }
}
