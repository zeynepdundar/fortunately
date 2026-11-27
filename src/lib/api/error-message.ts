/** Server errors arrive as the JSON body in error.message. */
export function errorMessage(error: Error): string {
  try {
    const body = JSON.parse(error.message) as {
      message?: string;
      error?: string;
    };
    if (body.message) return body.message;
    if (body.error === "invalid_input")
      return "The request was invalid. Check the posting and your model.";
  } catch {
    // not JSON: a provider or network error
  }
  return "Something went wrong. Check your provider, model and API key in Settings (for Ollama: is it running?), then try again.";
}
