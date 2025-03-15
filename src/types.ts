import {Except, FlattenArrayTypes, PlainObject, TypesInType} from "@nightmaregaurav/ts-utility-types";

export type EntityIdentifierType = string | number;
export type RelatedEntityIdentifierType = string | undefined | number;
export type EntityPropertyType = string | number | boolean | Date | undefined;
export type RelationalClassesIn<T> = Except<FlattenArrayTypes<TypesInType<T>>, EntityPropertyType>;

export type GetKeyFlatTypeFor<T extends PlainObject, Key extends keyof T> = 
  T[Key] extends (infer U extends PlainObject)[] ? U : T[Key];

export type PotentialEntityIdentifierIn<T> = {
  [K in keyof T]: T[K] extends EntityIdentifierType ? K : never;
}[keyof T];

export type PotentialRelationalEntityIdentifierIn<T> = {
  [K in keyof T]: T[K] extends RelatedEntityIdentifierType ? K : never;
}[keyof T];

export type RelationalPropertiesIn<T> = {
  [K in keyof T]: T[K] extends EntityPropertyType | EntityPropertyType[] ? never : K;
}[keyof T];

export type NonRelationalPropertiesIn<T> = {
  [K in keyof T]: T[K] extends EntityPropertyType ? K : never;
}[keyof T];

export type SingularRelationalPropertiesIn<T> = {
  [K in keyof T]: T[K] extends EntityPropertyType ? never : T[K] extends (infer U)[] ? never : K;
}[keyof T];

export type CollectionRelationalPropertiesIn<T> = {
  // two conditions: 1. Must be an array 2. Must not be an array of EntityPropertyType
  [K in keyof T]: T[K] extends (infer U)[] ? U extends EntityPropertyType ? never : K : never;
}[keyof T];