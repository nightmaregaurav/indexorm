# IndexORM (ORM for Indexed storage)
[![npm version](https://badge.fury.io/js/@nightmaregaurav%2Findexorm.svg)](https://badge.fury.io/js/@nightmaregaurav%2Findexorm)
[![HitCount](https://hits.dwyl.com/nightmaregaurav/indexorm.svg?style=flat)](http://hits.dwyl.com/nightmaregaurav/indexorm)<br>
[![NPM](https://nodei.co/npm/@nightmaregaurav/indexorm.png?mini=true)](https://nodei.co/npm/@nightmaregaurav/indexorm/)
***

## Description
IndexORM is a library that allows you to define classes that can be stored and retrieved from a data storage in a relational way. It is designed to mimic the behavior of a relational database ORM, but it is designed with Indexed storages like IndexedDB, LocalStorage, etc. in mind.

## Installation
```bash
npm install @nightmaregaurav/indexorm
````

### Declaring DataDriver
```typescript
// DataDriverSetup.ts (Somewhere in your entry point you must import this file/or place the register calls in a method and call it.)
import {DataDriver, LocalStorageDriver} from "@nightmaregaurav/indexorm";

DataDriver.configure(new LocalStorageDriver());  // or any other driver that implements IDriver
```

### Defining Entity Classes
```typescript
// Person.ts
import {Address} from "./Address";

export class Person {
  id: string;
  name: string;
  age: number;
  address: Address[]; // Never define a related collection property as nullable or optional
}
```
```typescript
// Address.ts
import {Person} from "./Person";

export class Address {
  id: string;
  street: string;
  city: string;
  personId: string;  // Optional property's Id can be defined as nullable
  person: Person;  // Optional property can be defined as nullable
}
```

### Defining Entity Class Specifications
```typescript
// PersonSpecification.ts
import {ClassSpecificationBuilder} from "@nightmaregaurav/indexorm";
import {Person} from "./Person";
import {Address} from "./Address";

export const PersonSpecification = new ClassSpecificationBuilder<Person>(Person)
  .as("person")  // Optional: By default it uses class name
  .hasIdentifier("id")
  .has("age")
  .has("name")
  .hasMany("address", Address, "personId")
  .build();
```
```typescript
// AddressSpecification.ts
import {ClassSpecificationBuilder} from "@nightmaregaurav/indexorm";
import {Person} from "./Person";
import {Address} from "./Address";

export const AddressSpecification = new ClassSpecificationBuilder<Address>(Address)
  .as("address")  // Optional: By default it uses class name
  .hasIdentifier("id")
  .has("city")
  .has("street")
  .has("personId")  // Optional: The line below will automatically add this as a property. 
  .hasOne("person", Person, "personId")
  .build();
```

### Registering Entity Class Specifications
```typescript
// DataRegistry.ts (Somewhere in your entry point you must import this file/or place the register calls in a method and call it.)
import {ClassSpecificationRegistry} from "@nightmaregaurav/indexorm";
import {PersonSpecification} from "./PersonSpecification";
import {AddressSpecification} from "./AddressSpecification";

ClassSpecificationRegistry.register(AddressSpecification);
ClassSpecificationRegistry.register(PersonSpecification);
```

### Setup Repositories
```typescript
// Repositories.ts
import {Repository} from "@nightmaregaurav/indexorm";
import {Person} from "./Person";
import {Address} from "./Address";

export const PersonRepository = new Repository(Person);
export const AddressRepository = new Repository(Address);
```

### Usage in Code
```typescript
const person1 = new Person();
person1.id = "1";
person1.name = "John";
person1.age = 30;

const address1 = new Address();
address1.id = "1";
address1.street = "Baraghare"
address1.city = "Damak";
address1.personId = "1";

const address2 = new Address();
address2.id = "2";
address2.street = "Sano Baraghare";
address2.city = "Damak";
address2.personId = "1";

const address3 = new Address();
address3.id = "3";
address3.street = "Setumari";
address3.city = "Damak";
address3.person = person1;

const address4 = new Address();
address4.id = "4";
address4.street = "101 Maple St";
address4.city = "Springfield";

const address5 = new Address();
address5.id = "5";
address5.street = "112 Pine St";
address5.city = "Springfield";

const person2 = new Person();
person2.id = "2";
person2.name = "Jane"
person2.age = 25;
person2.address = [address4, address5];

(async () => {
  await PersonRepository.create(person1);  // adds person1; address1, address2, address3 will not be added as they are not attached to person1
  await AddressRepository.create(address1);  // adds address1; will attach to person1 inferred from personId
  await AddressRepository.create(address2);  // adds address2; will attach to person1 inferred from personId
  await AddressRepository.create(address3);  // adds address3; will attach to person1 explicitly; will attempt to update person1
  await PersonRepository.create(person2);  // adds person2; address4, address5 will also be added as they are attached to person2

  const people = await PersonRepository
    .getQueryable()
    .include("address")
    .thenInclude("person")
    .getAll();

  const addressesInDamak = await AddressRepository
    .getQueryable()
    .include("person")  // include automatically adds the property to select but in case of a singular related property, it will only work if the related Id is manually added to select
    .where("city", x => x === "Damak")
    .select("id", "street");  // this will not select person as personId is not in the select

  console.log(people);
  console.log(addressesInDamak);

  const backup = await DataDriver.instance.dumpAll();
  console.log(backup);
  await DataDriver.instance.loadAll(backup);
})();
```

### Output of above example will look like this
```json
[
  {
    "id": "1",
    "age": 30,
    "name": "John",
    "address": [
      {
        "id": "1",
        "city": "Damak",
        "street": "Baraghare",
        "personId": "1",
        "person": {
          "id": "1",
          "age": 30,
          "name": "John"
        }
      },
      {
        "id": "2",
        "city": "Damak",
        "street": "Sano Baraghare",
        "personId": "1",
        "person": {
          "id": "1",
          "age": 30,
          "name": "John"
        }
      },
      {
        "id": "3",
        "city": "Damak",
        "street": "Setumari",
        "personId": "1",
        "person": {
          "id": "1",
          "age": 30,
          "name": "John"
        }
      }
    ]
  },
  {
    "id": "2",
    "age": 25,
    "name": "Jane",
    "address": [
      {
        "id": "4",
        "city": "Springfield",
        "street": "101 Maple St",
        "personId": "2",
        "person": {
          "id": "2",
          "age": 25,
          "name": "Jane"
        }
      },
      {
        "id": "5",
        "city": "Springfield",
        "street": "112 Pine St",
        "personId": "2",
        "person": {
          "id": "2",
          "age": 25,
          "name": "Jane"
        }
      }
    ]
  }
]
```
```json
[
  {
    "id": "1",
    "street": "Baraghare"
  },
  {
    "id": "2",
    "street": "Sano Baraghare"
  },
  {
    "id": "3",
    "street": "Setumari"
  }
]
```
```json
{
  "indexorm::::index-of::address-identifiers::": "[\"1\",\"2\",\"3\",\"4\",\"5\"]",
  "indexorm::::index-of::address-identifiers::which-has-one::person::as::personId::with-identifier::1::": "[\"1\",\"2\",\"3\"]",
  "indexorm::::index-of::address-identifiers::which-has-one::person::as::personId::with-identifier::2::": "[\"4\",\"5\"]",
  "indexorm::::index-of::person-identifiers::": "[\"1\",\"2\"]",
  "indexorm::address:1:city;": "\"Damak\"",
  "indexorm::address:1:id;": "\"1\"",
  "indexorm::address:1:personId;": "\"1\"",
  "indexorm::address:1:street;": "\"Baraghare\"",
  "indexorm::address:2:city;": "\"Damak\"",
  "indexorm::address:2:id;": "\"2\"",
  "indexorm::address:2:personId;": "\"1\"",
  "indexorm::address:2:street;": "\"Sano Baraghare\"",
  "indexorm::address:3:city;": "\"Damak\"",
  "indexorm::address:3:id;": "\"3\"",
  "indexorm::address:3:personId;": "\"1\"",
  "indexorm::address:3:street;": "\"Setumari\"",
  "indexorm::address:4:city;": "\"Springfield\"",
  "indexorm::address:4:id;": "\"4\"",
  "indexorm::address:4:personId;": "\"2\"",
  "indexorm::address:4:street;": "\"101 Maple St\"",
  "indexorm::address:5:city;": "\"Springfield\"",
  "indexorm::address:5:id;": "\"5\"",
  "indexorm::address:5:street;": "\"112 Pine St\"",
  "indexorm::person:1:age;": "30",
  "indexorm::person:1:id;": "\"1\"",
  "indexorm::person:1:name;": "\"John\"",
  "indexorm::person:2:age;": "25",
  "indexorm::person:2:id;": "\"2\"",
  "indexorm::person:2:name;": "\"Jane\"",
  "indexorm::address:5:personId;": "\"2\""
}
```

### Backup and Restore
```typescript
// Backup.ts
import {DataDriver} from "@nightmaregaurav/indexorm";

const dump = await DataDriver.dumpAll();
// do whatever you want with dump
```
```typescript
// Restore.ts
import {DataDriver} from "@nightmaregaurav/indexorm";

// get dump from somewhere
await DataDriver.loadAll(dump);
```

## How to Contribute
* Fork the repository
* Clone the forked repository
* Make changes
* Commit and push the changes
* Create a pull request
* Wait for the pull request to be merged

*If you are new to open source, you can read [this](https://opensource.guide/how-to-contribute/) to learn how to contribute to open source projects.*<br>
*If you are new to GitHub, you can read [this](https://guides.github.com/activities/hello-world/) to learn how to use GitHub.*<br>
*If you are new to Git, you can read [this](https://www.atlassian.com/git/tutorials/learn-git-with-bitbucket-cloud) to learn how to use Git.*<br>
*If you are new to TypeScript, you can read [this](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) to learn how to use TypeScript.*<br>


## License
IndexORM is released under the MIT License. You can find the full license details in the [LICENSE](LICENSE) file.

Made with ❤️ by [NightmareGaurav](https://github.com/nightmaregaurav).

---
Open For Contribution
---
