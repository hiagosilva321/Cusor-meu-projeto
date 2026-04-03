const ORDER_ACCESS_TOKEN_PREFIX = "cacambaja:order-access-token:";

function getStorageKey(orderId: string): string {
  return `${ORDER_ACCESS_TOKEN_PREFIX}${orderId}`;
}

export function storeOrderAccessToken(orderId: string, token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(getStorageKey(orderId), token);
}

export function getOrderAccessToken(
  orderId: string,
  candidateToken?: string | null,
): string | null {
  const trimmedCandidate = candidateToken?.trim();
  if (trimmedCandidate) {
    storeOrderAccessToken(orderId, trimmedCandidate);
    return trimmedCandidate;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(getStorageKey(orderId));
}
