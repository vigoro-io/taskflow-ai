const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3.5";

type InputType = "document" | "query";

async function embed(
  inputs: string[],
  inputType: InputType
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: inputs,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI error ${response.status}: ${error}`);
  }

  const json = (await response.json()) as {
    data: { embedding: number[]; index: number }[];
  };

  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  return embed(texts, "document");
}

export async function embedQuery(text: string): Promise<number[]> {
  const results = await embed([text], "query");
  return results[0];
}
