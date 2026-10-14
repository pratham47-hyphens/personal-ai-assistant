const OLLAMA_URL = 'http://localhost:11434/api/generate';

export const generateResponse = async (prompt, model = 'llama3', onChunk = (chunk) => {}) => {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line) continue;
        try {
          const json = JSON.parse(line);
          if (json.response) {
            fullResponse += json.response;
            onChunk(json.response);
          }
          if (json.done) break;
        } catch (e) {
          console.error('Error parsing JSON chunk', e);
        }
      }
    }
    return fullResponse;
  } catch (error) {
    console.error('Ollama Service Error:', error);
    throw error;
  }
};
