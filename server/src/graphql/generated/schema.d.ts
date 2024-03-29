/**
 * This file was generated by Nexus Schema
 * Do not make changes to this file directly
 */


import type { User, Contact, CalendarEvent } from "@prisma/client"




declare global {
  interface NexusGen extends NexusGenTypes {}
}

export interface NexusGenInputs {
}

export interface NexusGenEnums {
}

export interface NexusGenScalars {
  String: string
  Int: number
  Float: number
  Boolean: boolean
  ID: string
}

export interface NexusGenObjects {
  CalendarEvent: CalendarEvent;
  Contact: Contact;
  Mutation: {};
  Query: {};
  User: User;
}

export interface NexusGenInterfaces {
}

export interface NexusGenUnions {
}

export type NexusGenRootTypes = NexusGenObjects

export type NexusGenAllTypes = NexusGenRootTypes & NexusGenScalars

export interface NexusGenFieldTypes {
  CalendarEvent: { // field return type
    id: string; // String!
    start: string; // String!
    title: string; // String!
  }
  Contact: { // field return type
    calendarEvents: Array<NexusGenRootTypes['CalendarEvent'] | null> | null; // [CalendarEvent]
    displayName: string; // String!
    id: string; // String!
    percentPastDue: number; // Int!
    photoURL: string; // String!
  }
  Mutation: { // field return type
    login: string | null; // String
    sync: string | null; // String
    updateContactAffinity: NexusGenRootTypes['Contact'] | null; // Contact
  }
  Query: { // field return type
    contact: NexusGenRootTypes['Contact'] | null; // Contact
    viewer: NexusGenRootTypes['User'] | null; // User
  }
  User: { // field return type
    contacts: Array<NexusGenRootTypes['Contact'] | null> | null; // [Contact]
    displayName: string; // String!
    id: string; // String!
  }
}

export interface NexusGenFieldTypeNames {
  CalendarEvent: { // field return type name
    id: 'String'
    start: 'String'
    title: 'String'
  }
  Contact: { // field return type name
    calendarEvents: 'CalendarEvent'
    displayName: 'String'
    id: 'String'
    percentPastDue: 'Int'
    photoURL: 'String'
  }
  Mutation: { // field return type name
    login: 'String'
    sync: 'String'
    updateContactAffinity: 'Contact'
  }
  Query: { // field return type name
    contact: 'Contact'
    viewer: 'User'
  }
  User: { // field return type name
    contacts: 'Contact'
    displayName: 'String'
    id: 'String'
  }
}

export interface NexusGenArgTypes {
  Mutation: {
    login: { // args
      googleAuthCode: string; // String!
    }
    sync: { // args
      calendars?: boolean | null; // Boolean
      clear?: boolean | null; // Boolean
      contacts?: boolean | null; // Boolean
      notion?: boolean | null; // Boolean
    }
    updateContactAffinity: { // args
      affinity: string; // String!
      contactID: string; // String!
    }
  }
  Query: {
    contact: { // args
      id: string; // String!
    }
  }
}

export interface NexusGenAbstractTypeMembers {
}

export interface NexusGenTypeInterfaces {
}

export type NexusGenObjectNames = keyof NexusGenObjects;

export type NexusGenInputNames = never;

export type NexusGenEnumNames = never;

export type NexusGenInterfaceNames = never;

export type NexusGenScalarNames = keyof NexusGenScalars;

export type NexusGenUnionNames = never;

export type NexusGenObjectsUsingAbstractStrategyIsTypeOf = never;

export type NexusGenAbstractsUsingStrategyResolveType = never;

export type NexusGenFeaturesConfig = {
  abstractTypeStrategies: {
    isTypeOf: false
    resolveType: true
    __typename: false
  }
}

export interface NexusGenTypes {
  context: any;
  inputTypes: NexusGenInputs;
  rootTypes: NexusGenRootTypes;
  inputTypeShapes: NexusGenInputs & NexusGenEnums & NexusGenScalars;
  argTypes: NexusGenArgTypes;
  fieldTypes: NexusGenFieldTypes;
  fieldTypeNames: NexusGenFieldTypeNames;
  allTypes: NexusGenAllTypes;
  typeInterfaces: NexusGenTypeInterfaces;
  objectNames: NexusGenObjectNames;
  inputNames: NexusGenInputNames;
  enumNames: NexusGenEnumNames;
  interfaceNames: NexusGenInterfaceNames;
  scalarNames: NexusGenScalarNames;
  unionNames: NexusGenUnionNames;
  allInputTypes: NexusGenTypes['inputNames'] | NexusGenTypes['enumNames'] | NexusGenTypes['scalarNames'];
  allOutputTypes: NexusGenTypes['objectNames'] | NexusGenTypes['enumNames'] | NexusGenTypes['unionNames'] | NexusGenTypes['interfaceNames'] | NexusGenTypes['scalarNames'];
  allNamedTypes: NexusGenTypes['allInputTypes'] | NexusGenTypes['allOutputTypes']
  abstractTypes: NexusGenTypes['interfaceNames'] | NexusGenTypes['unionNames'];
  abstractTypeMembers: NexusGenAbstractTypeMembers;
  objectsUsingAbstractStrategyIsTypeOf: NexusGenObjectsUsingAbstractStrategyIsTypeOf;
  abstractsUsingStrategyResolveType: NexusGenAbstractsUsingStrategyResolveType;
  features: NexusGenFeaturesConfig;
}


declare global {
  interface NexusGenPluginTypeConfig<TypeName extends string> {
  }
  interface NexusGenPluginInputTypeConfig<TypeName extends string> {
  }
  interface NexusGenPluginFieldConfig<TypeName extends string, FieldName extends string> {
  }
  interface NexusGenPluginInputFieldConfig<TypeName extends string, FieldName extends string> {
  }
  interface NexusGenPluginSchemaConfig {
  }
  interface NexusGenPluginArgConfig {
  }
}