import * as Comlink from "comlink";
import React, { createContext, useContext, useEffect, useRef } from "react";

import Logger from "../logging";
import { deserialize, isSerializable, serialize } from "./serialization.js";

const LOG = Logger.get("ModelContext");

Comlink.transferHandlers.set("custom", {
  canHandle: (obj) => isSerializable(obj),
  serialize: (obj) => [serialize(obj), []],
  deserialize: (data) => deserialize(data),
});

class ModelInstance {
  constructor(cls, config = {}) {
    this._cls = cls;
    this._config = config;
    this._listeners = new Map();
    this._adapter = null;
    this._worker = null;
    LOG.debug(`Created ModelInstance of type ${cls} with config`, config);

    // Return a Proxy that routes method calls to the adapter
    // Similar to Python's __getattr__
    this._proxy = new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }

        // Return a shadow function that calls the adapter method
        return (...args) => target._callAdapter(prop, args);
      },
    });
    return this._proxy;
  }

  async _callAdapter(method, args) {
    // Lazy initialization of the worker
    if (!this._adapter) {
      this._worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
      const api = Comlink.wrap(this._worker);

      // Create event proxy
      const eventProxy = Comlink.proxy((eventType, eventData) => {
        this._listeners.get(eventType)?.forEach((handler) => handler(eventData));
      });

      this._adapter = await api.createAdapter(this._cls, this._config, eventProxy);
    }

    return await this._adapter[method](...args);
  }

  /**
   * Registers an event listener for a specific event type.
   * @param {string} eventType - The type of event to listen for.
   * @param {Function} handler - The callback function to execute when the event occurs.
   * @returns {ModelInstance} The current instance for chaining.
   */
  on(eventType, handler) {
    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }
    this._listeners.get(eventType).add(handler);
    return this._proxy;
  }

  /**
   * Removes an event listener for a specific event type.
   * @param {string} eventType - The type of event to stop listening for.
   * @param {Function} handler - The callback function to remove.
   * @returns {ModelInstance} The current instance for chaining.
   */
  off(eventType, handler) {
    this._listeners.get(eventType)?.delete(handler);
    return this._proxy;
  }

  resetListeners(eventType) {
    if (eventType) {
      this._listeners.get(eventType)?.clear();
    } else {
      this._listeners.clear();
    }
    return this._proxy;
  }

  /**
   * Disposes of the worker and cleans up resources.
   * @returns {Promise<void>} A promise that resolves when the worker is terminated.
   */
  async dispose() {
    if (this._adapter && this._adapter.dispose) {
      await this._adapter.dispose();
    }
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
      this._adapter = null;
    }
  }
}

const ModelContext = createContext(null);

export function ModelProvider({ children }) {
  /**
   * Provides a context for managing model instances.
   * @param {React.ReactNode} children - The child components to render.
   */
  const models = useRef(new Map());

  useEffect(() => {
    return () => {
      models.current.forEach((model) => model.dispose());
      models.current.clear();
    };
  }, []);

  /**
   * Retrieves or creates a model instance.
   * @param {string} adapterType - The type of adapter to use for the model.
   * @param {string} [id] - Unique identifier for the model instance.
   * @param {object} config - Configuration options for the model.
   * @returns {ModelInstance} The retrieved or newly created model instance.
   */
  const getOrCreateModel = ({ adapterType, id, config = {} }) => {
    const key = id || `${adapterType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (!models.current.has(key)) {
      models.current.set(key, new ModelInstance(adapterType, config));
    }
    return models.current.get(key);
  };

  /**
   * Disposes of a specific model instance.
   * @param {string|ModelInstance} modelOrId - The model instance or its unique identifier.
   */
  const disposeModel = (modelOrId) => {
    const key = typeof modelOrId === "string" ? modelOrId : modelOrId.id;
    const model = models.current.get(key);
    if (model) {
      model.dispose();
      models.current.delete(key);
    }
  };

  return (
    <ModelContext.Provider value={{ getOrCreateModel, disposeModel }}>
      {children}
    </ModelContext.Provider>
  );
}

/**
 * Hook to access the model context.
 * @returns {object} The model context with `getOrCreateModel` and `disposeModel` methods.
 * @throws {Error} If used outside of a `ModelProvider`.
 */
export const useModel = () => {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel must be used within ModelProvider");
  return ctx;
};
