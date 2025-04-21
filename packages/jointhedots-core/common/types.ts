
export interface MapLike<T> {
   [index: string]: T
}

export type ObjectClass<T extends Object = any> = new (...args) => T

export type Overwrite<Base, Overrides> = Omit<Base, keyof Overrides> & Overrides

export function areSimilarObjects(x: MapLike<any>, y: MapLike<any>): boolean {
    for (const key in x) {
        if (x[key] !== y[key]) {
            return false
        }
    }
    for (const key in y) {
        if (x[key] !== y[key]) {
            return false
        }
    }
    return true
}
