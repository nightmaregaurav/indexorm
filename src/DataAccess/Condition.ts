import {NonRelationalPropertiesIn} from "../types";

/** A condition that can be used to filter data.
 *  @typeparam T The type of the data source to apply the condition to.
 *  @typeparam K The key of the data to be filtered from the data type, must be a non-relational property from T.
 */
export interface Condition<T, K extends NonRelationalPropertiesIn<T>, > {
  /** The key of the data to be filtered from the data type. */
  key: K;

  /** The test to apply to the data to determine if it should be included in the result.
   * @param value The value of the data to test.
   * @returns True if the data should be included in the result, otherwise false.
   */
  test: (value: T[K]) => boolean;
}