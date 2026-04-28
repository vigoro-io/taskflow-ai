import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchTasks } from "../search";

// Mock de los módulos
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/embeddings", () => ({
  embedQuery: vi.fn(),
}));

describe("searchTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when no matches found", async () => {
    const mockEmbedQuery = (await import("@/lib/embeddings")).embedQuery;
    const mockCreateClient = (await import("@/lib/supabase/server"))
      .createClient;

    vi.mocked(mockEmbedQuery).mockResolvedValue(new Array(1024).fill(0));

    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(mockCreateClient).mockResolvedValue({
      rpc: mockRpc,
    } as any);

    const result = await searchTasks("query sin resultados", 0.5, 5);

    expect(result).toEqual([]);
    expect(mockRpc).toHaveBeenCalledWith("match_task_embeddings", {
      query_embedding: expect.any(String),
      match_threshold: 0.5,
      match_count: 5,
    });
  });

  it("should return search results sorted by similarity", async () => {
    const mockEmbedQuery = (await import("@/lib/embeddings")).embedQuery;
    const mockCreateClient = (await import("@/lib/supabase/server"))
      .createClient;

    vi.mocked(mockEmbedQuery).mockResolvedValue(new Array(1024).fill(0));

    const mockResults = [
      {
        task_id: "1",
        content: "Tarea importante",
        similarity: 0.95,
      },
      {
        task_id: "2",
        content: "Otra tarea",
        similarity: 0.85,
      },
    ];

    const mockRpc = vi.fn().mockResolvedValue({ data: mockResults, error: null });
    vi.mocked(mockCreateClient).mockResolvedValue({
      rpc: mockRpc,
    } as any);

    const result = await searchTasks("tarea importante");

    expect(result).toEqual(mockResults);
    expect(result[0].similarity).toBeGreaterThan(result[1].similarity);
  });

  it("should throw error when VOYAGE_API_KEY is missing", async () => {
    const mockEmbedQuery = (await import("@/lib/embeddings")).embedQuery;

    vi.mocked(mockEmbedQuery).mockRejectedValue(
      new Error("VOYAGE_API_KEY is not set")
    );

    await expect(searchTasks("test query")).rejects.toThrow(
      "VOYAGE_API_KEY is not set"
    );
  });

  it("should throw error when RPC function fails", async () => {
    const mockEmbedQuery = (await import("@/lib/embeddings")).embedQuery;
    const mockCreateClient = (await import("@/lib/supabase/server"))
      .createClient;

    vi.mocked(mockEmbedQuery).mockResolvedValue(new Array(1024).fill(0));

    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "function match_task_embeddings does not exist" },
    });

    vi.mocked(mockCreateClient).mockResolvedValue({
      rpc: mockRpc,
    } as any);

    await expect(searchTasks("test query")).rejects.toThrow(
      "function match_task_embeddings does not exist"
    );
  });

  it("should use custom threshold and match count", async () => {
    const mockEmbedQuery = (await import("@/lib/embeddings")).embedQuery;
    const mockCreateClient = (await import("@/lib/supabase/server"))
      .createClient;

    vi.mocked(mockEmbedQuery).mockResolvedValue(new Array(1024).fill(0));

    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(mockCreateClient).mockResolvedValue({
      rpc: mockRpc,
    } as any);

    await searchTasks("test", 0.7, 10);

    expect(mockRpc).toHaveBeenCalledWith("match_task_embeddings", {
      query_embedding: expect.any(String),
      match_threshold: 0.7,
      match_count: 10,
    });
  });

  it("should handle null data from RPC", async () => {
    const mockEmbedQuery = (await import("@/lib/embeddings")).embedQuery;
    const mockCreateClient = (await import("@/lib/supabase/server"))
      .createClient;

    vi.mocked(mockEmbedQuery).mockResolvedValue(new Array(1024).fill(0));

    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(mockCreateClient).mockResolvedValue({
      rpc: mockRpc,
    } as any);

    const result = await searchTasks("test query");

    expect(result).toEqual([]);
  });

  it("should properly serialize embedding as JSON", async () => {
    const mockEmbedQuery = (await import("@/lib/embeddings")).embedQuery;
    const mockCreateClient = (await import("@/lib/supabase/server"))
      .createClient;

    const testEmbedding = [0.1, 0.2, 0.3];
    vi.mocked(mockEmbedQuery).mockResolvedValue(testEmbedding);

    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(mockCreateClient).mockResolvedValue({
      rpc: mockRpc,
    } as any);

    await searchTasks("test");

    expect(mockRpc).toHaveBeenCalledWith("match_task_embeddings", {
      query_embedding: JSON.stringify(testEmbedding),
      match_threshold: 0.5,
      match_count: 10,
    });
  });
});
