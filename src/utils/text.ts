/**
 * Converts a base64-encoded string to a UTF-8 string.
 *
 * @param base64 - The base64-encoded string to convert.
 *
 * @returns The decoded UTF-8 string. Returns an empty string if input is falsy.
 *          If the conversion fails, returns the raw binary string.
 */
export function base64ToUtf8(base64: string): string {
  if (!base64) {
    return ''
  }

  const binary = atob(base64)

  try {
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  }
  catch (err) {
    console.error('Failed to decode base64 UTF-8 text:', err)
    return binary
  }
}
