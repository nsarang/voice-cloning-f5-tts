import React, { createContext, useContext, useEffect, useRef } from "react";

import { MESSAGES } from "./adapters.js";
import { deserialize, serialize } from "./serialization.js";

const ModelContext = createContext(null);

class ModelInstance {
  constructor(adapterType, config = {}) {
    /**
     * Creates a new instance of the model with the specified adapter type and configuration.
     * @param {string} adapterType - The type of adapter to use for the model.
     * @param {object} config - Configuration options for the model constructor.
     */
    this.adapterType = adapterType;
    this.config = config;
    this.worker = this._createWorker();
    this.callbacks = {};
    this.listeners = new Map();
    this.ready = false;
    this.id = 0;
    this.readyPromise = null;
  }

  /**
   * Registers an event listener for a specific event type.
   * @param {string} eventType - The type of event to listen for.
   * @param {Function} handler - The callback function to execute when the event occurs.
   * @returns {ModelInstance} The current instance for chaining.
   */
  on(eventType, handler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(handler);
    return this;
  }

  /**
   * Removes an event listener for a specific event type.
   * @param {string} eventType - The type of event to stop listening for.
   * @param {Function} handler - The callback function to remove.
   * @returns {ModelInstance} The current instance for chaining.
   */
  off(eventType, handler) {
    this.listeners.get(eventType)?.delete(handler);
    return this;
  }

  /**
   * Initializes the model by sending an initialization message to the worker.
   */
  initialize() {
    if (this.readyPromise) {
      return; // If readyPromise is already set, init has been called
    }

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this._send(MESSAGES.INITIALIZE, { adapterType: this.adapterType, config: this.config });
  }

  /**
   * Processes input data using the model.
   * @param {any} input - The input data to process.
   * @returns {Promise<any>} A promise that resolves with the processed output.
   */
  async process(input) {
    if (!this.ready) {
      await this.readyPromise;
    }
    return this._send(MESSAGES.PROCESS, { input });
  }

  /**
   * Disposes of the worker and cleans up resources.
   * @returns {Promise<void>} A promise that resolves when the worker is terminated.
   */
  async dispose() {
    if (this.worker) {
      this.worker.postMessage({ type: MESSAGES.DISPOSE, id: -1 });
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }

  // --- Private Methods ---
  /**
   * Sends a message to the worker and returns a promise for the response.
   * @param {string} type - The type of message to send.
   * @param {object} data - The data to include in the message.
   * @returns {Promise<any>} A promise that resolves with the worker's response.
   */
  _send(type, data) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks[id] = (response) => {
        if (response.type === MESSAGES.ERROR) {
          const error = new Error(response.error.message);
          error.name = response.error.name;
          error.stack = response.error.stack;
          reject(error);
        } else if (response.type === MESSAGES.RESULT) {
          resolve(deserialize(response.result)); // Automatically deserialize the result
        } else {
          resolve(response);
        }
      };
      this.worker.postMessage(serialize({ ...data, type, id })); // Automatically serialize the message
    });
  }

  /**
   * Creates a new Web Worker for the model.
   * @returns {Worker} The created worker instance.
   */
  _createWorker() {
    const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

    worker.onmessage = ({ data }) => {
      // Generic event
      if (data.type === MESSAGES.EVENT) {
        const handlers = this.listeners.get(data.eventType);
        if (handlers) {
          handlers.forEach((handler) => handler(data.eventData));
        }
      }
      // Worker readiness
      if (data.type === MESSAGES.READY && !this.ready) {
        this.ready = true;
        if (this.readyResolve) {
          this.readyResolve();
          this.readyResolve = null;
        }
      }
      // Handle request/response callbacks
      if (data.id && this.callbacks[data.id]) {
        this.callbacks[data.id](data);
        delete this.callbacks[data.id];
      }
    };

    return worker;
  }
}

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
   * @param {object} config - Configuration options for the model.
   * @returns {ModelInstance} The retrieved or newly created model instance.
   */
  const getOrCreateModel = (adapterType, config = {}) => {
    const key =
      config.id || `${adapterType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (!models.current.has(key)) {
      models.current.set(key, new ModelInstance(adapterType, config));
    }

    return models.current.get(key);
  };

  /**
   * Disposes of a specific model instance.
   * @param {string|ModelInstance} modelOrKey - The model instance or its key to dispose of.
   */
  const disposeModel = (modelOrKey) => {
    const key = typeof modelOrKey === "string" ? modelOrKey : modelOrKey.config.id;
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
