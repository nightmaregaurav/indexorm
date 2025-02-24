import {Class, PlainObject} from "@nightmaregaurav/ts-utility-types";
import RelationalProperty from "./RelationalProperty";
import {RelationalClassesIn} from "../types";

/** A specification for a class that can be used to interact with a repository.
 * @typeparam T The type of the class that the specification is for.
 */
export default class ClassSpecification<T extends PlainObject> {
  /** The class that the specification is for. */
  class: Class<T>;
  
  /** The name of the table that the data is supposed to be stored in. */
  tableName: string;
  
  /** The name of the property that is used to identify the data. */
  identifierProperty: string;
  
  /** The names of the properties that are not related to other classes. */
  nonRelationalProperties: string[];
  
  /** The names of the properties that are related to other classes. */
  relationalProperties: RelationalProperty<RelationalClassesIn<T>>[];
}