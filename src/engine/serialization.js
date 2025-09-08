import { Tensor } from "../core/tjs/utils/torch.js";

const TypeRegistry = new Map();

export function registerType(typeName, typeClass) {
  if (
    (typeof typeClass.prototype.__serialize__ === "function" &&
      typeof typeClass.__deserialize__ === "function") ||
    (typeof typeClass.prototype.toJSON === "function" && typeof typeClass.fromJSON === "function")
  ) {
    TypeRegistry.set(typeName, typeClass);
  } else {
    throw new Error(
      `Type "${typeName}" must implement either __serialize__/__deserialize__ or toJSON/fromJSON.`
    );
  }
}

export function getType(typeName) {
  const typeClass = TypeRegistry.get(typeName);
  if (!typeClass) {
    throw new Error(`Unknown type: ${typeName}`);
  }
  return typeClass;
}

export function getTypeName(typeClass) {
  for (const [typeName, registeredClass] of TypeRegistry.entries()) {
    if (registeredClass === typeClass) {
      return typeName;
    }
  }
  throw new Error(`Class not registered: ${typeClass.name}`);
}

function isPlainObject(obj) {
  return obj !== null && typeof obj === "object" && Object.getPrototypeOf(obj) === Object.prototype;
}

export function serialize(data) {
  // Skip primitives and typed arrays (e.g., Float32Array)
  if (data === null || typeof data !== "object" || ArrayBuffer.isView(data)) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(serialize);
  }
  if (isPlainObject(data)) {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, serialize(value)]));
  }

  const typeName = getTypeName(data.constructor);
  const serializer = typeof data.__serialize__ === "function" ? data.__serialize__ : data.toJSON;
  return {
    __type: typeName,
    __content: serializer.call(data),
  };
}

export function deserialize(data) {
  if (data === null || typeof data !== "object" || ArrayBuffer.isView(data)) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(deserialize);
  }

  if (data.__type) {
    const TypeClass = getType(data.__type);
    const deserializer =
      typeof TypeClass.__deserialize__ === "function"
        ? TypeClass.__deserialize__
        : TypeClass.fromJSON;
    return deserializer(data.__content);
  }

  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, deserialize(value)]));
}

// Utility functions for Comlink integration
export function isSerializable(data) {
  try {
    if (data === null || typeof data !== "object" || ArrayBuffer.isView(data)) {
      return true;
    }
    if (Array.isArray(data)) {
      return data.every(isSerializable);
    }
    if (isPlainObject(data)) {
      return Object.values(data).every(isSerializable);
    }
    return getTypeName(data.constructor) !== null;
  } catch {
    return false;
  }
}

registerType("Tensor", Tensor);
