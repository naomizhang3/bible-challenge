// Runs before the app becomes interactive — a safe place for polyfills.
// Object.hasOwn is Safari 15.4+; polyfill it for older iOS 15 devices so
// hydration doesn't crash on them.
if (typeof Object.hasOwn !== "function") {
  Object.defineProperty(Object, "hasOwn", {
    value: (obj: object, prop: PropertyKey) =>
      Object.prototype.hasOwnProperty.call(obj, prop),
    configurable: true,
    writable: true,
  });
}
