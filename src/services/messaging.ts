/**
 * Typed wrapper around `chrome.runtime` messaging.
 *
 * `sendMessage` infers the response type from the request's discriminant, so
 * callers get full type-safety with no casts. The background registers a single
 * handler via `onMessage`.
 */
import type {
  BroadcastMessage,
  RequestMessage,
  ResponseFor,
} from '@/types';

/** Sends a typed request and resolves with its typed response. */
export async function sendMessage<T extends RequestMessage>(
  message: T,
): Promise<ResponseFor<T['type']>> {
  return chrome.runtime.sendMessage(message);
}

/** Fire-and-forget send that swallows "receiving end does not exist" errors. */
export function sendMessageSafe<T extends RequestMessage>(message: T): void {
  try {
    void chrome.runtime.sendMessage(message).catch(() => {
      /* no receiver (e.g. worker asleep) — safe to ignore */
    });
  } catch {
    /* context invalidated — ignore */
  }
}

type Handler = (
  message: RequestMessage,
  sender: chrome.runtime.MessageSender,
) => Promise<unknown> | unknown;

/**
 * Registers the single background message handler. Supports async responses by
 * returning `true` from the listener and resolving via `sendResponse`.
 */
export function onMessage(handler: Handler): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message as RequestMessage, sender);
    if (result instanceof Promise) {
      result
        .then((value) => sendResponse(value))
        .catch((error: unknown) => {
          console.error('[Aperture] message handler error', error);
          sendResponse({ error: String(error) });
        });
      return true; // keep the channel open for the async response
    }
    sendResponse(result);
    return false;
  });
}

/** Subscribes to background broadcast events. Returns an unsubscribe fn. */
export function onBroadcast(
  handler: (message: BroadcastMessage) => void,
): () => void {
  const listener = (message: unknown): void => {
    if (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      typeof (message as { type: unknown }).type === 'string' &&
      (message as { type: string }).type.match(
        /^(STATUS_CHANGED|LIMIT_REACHED|DAY_RESET|OVERRIDE_ENDED)$/,
      )
    ) {
      handler(message as BroadcastMessage);
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

/** Broadcasts an event to all extension contexts (best-effort). */
export function broadcast(message: BroadcastMessage): void {
  try {
    void chrome.runtime.sendMessage(message).catch(() => {
      /* no listeners — ignore */
    });
  } catch {
    /* ignore */
  }
}
