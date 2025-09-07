import { adapterRegistry, MESSAGES } from "./adapters.js";
import { deserialize, serialize } from "./serialization.js"; // Import serialization utilities

let adapter = null;

function sendMessage(message) {
  self.postMessage(serialize(message));
}

self.onmessage = async ({ data }) => {
  const deserializedData = deserialize(data);
  const { type, id, adapterType, config, input } = deserializedData;

  try {
    if (type === MESSAGES.INITIALIZE) {
      const createAdapter = adapterRegistry[adapterType];
      if (!createAdapter) throw new Error(`Unknown adapter type: ${adapterType}`);

      adapter = createAdapter({
        ...config,
        emit: (eventType, eventData) => {
          sendMessage({ id, type: MESSAGES.EVENT, eventType, eventData });
        },
      });

      await adapter.initialize();
      sendMessage({ id, type: MESSAGES.READY });
    } else if (type === MESSAGES.PROCESS) {
      if (!adapter) throw new Error("Adapter not initialized");
      const result = await adapter.process({ ...input });
      sendMessage({ id, type: MESSAGES.RESULT, result });
    } else if (type === MESSAGES.DISPOSE) {
      if (adapter) await adapter.dispose();
      self.close();
    } else {
      throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    sendMessage({
      id,
      type: MESSAGES.ERROR,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
    });
  }
};
