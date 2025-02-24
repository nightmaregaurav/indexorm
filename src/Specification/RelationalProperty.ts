import {Class, PlainObject} from "@nightmaregaurav/ts-utility-types";

/** A relational property that is related to another class.
 * @typeparam T The type of the class that the property is related to.
 */
export default interface RelationalProperty<T extends PlainObject> {
  /** The name of the property. */
  name: string;
  
  /** The class that the property is related to. */
  class: Class<T>;
  
  /** The name of the property in the related class that is used to identify the data. */
  correspondingIdentifierProperty: string;
  
  /** Whether the relation is a collection or not. */
  isCollection: boolean;
}