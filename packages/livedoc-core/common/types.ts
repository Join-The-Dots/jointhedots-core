
export interface MapLike<T> {
   [index: string]: T
}

export type ObjectClass<T extends Object = any> = new (...args) => T

export type Overwrite<Base, Overrides> = Omit<Base, keyof Overrides> & Overrides
