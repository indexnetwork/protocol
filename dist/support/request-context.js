import { AsyncLocalStorage } from "async_hooks";
/**
 * AsyncLocalStorage for propagating request-scoped context through the protocol layer.
 * The host application is responsible for calling `requestContext.run()` to set the context.
 */
export const requestContext = new AsyncLocalStorage();
//# sourceMappingURL=request-context.js.map