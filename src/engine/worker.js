import * as Comlink from "comlink";

import Logger from "../logging.js";
import { adapterRegistry } from "./adapters.js";
import { deserialize, isSerializable, serialize } from "./serialization.js";

const LOG = Logger.get("WebWorker");

Comlink.transferHandlers.set("custom", {
  canHandle: (obj) => isSerializable(obj),
  serialize: (obj) => [serialize(obj), []],
  deserialize: (data) => deserialize(data),
});

Comlink.expose({
  createAdapter(adapterType, config, eventProxy) {
    LOG.debug(`Request to create adapter of type ${adapterType} with config`, config);
    const AdapterClass = adapterRegistry[adapterType];
    if (!AdapterClass) throw new Error(`Unknown adapter type: ${adapterType}`);

    const adapter = AdapterClass({
      ...config,
      emit: eventProxy,
    });

    return Comlink.proxy(adapter);
  },
});
