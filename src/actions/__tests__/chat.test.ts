import { describe, it, expect, vi, beforeEach } from "vitest";
import * as searchModule from "../search";

const mockCreate = vi.fn();

// Mock de Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockCreate,
      };
    },
  };
});

// Mock de search
vi.mock("../search", () => ({
  searchTasks: vi.fn(),
}));

// Import después de los mocks
const { chatWithTasks } = await import("../chat");

describe("chatWithTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "sk-ant-test123";
  });

  it("should throw error when ANTHROPIC_API_KEY is missing", async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    vi.mocked(searchModule.searchTasks).mockResolvedValue([]);

    try {
      await expect(chatWithTasks("test query")).rejects.toThrow();
    } finally {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  it("should handle empty search results", async () => {
    // Mock searchTasks para devolver array vacío
    vi.mocked(searchModule.searchTasks).mockResolvedValue([]);

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "No encontré tareas relevantes." }],
    });

    const result = await chatWithTasks("¿qué tareas tengo?");

    expect(result).toHaveProperty("answer");
    expect(result).toHaveProperty("sources");
    expect(result.sources).toEqual([]);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: expect.stringContaining("No se encontraron tareas relevantes"),
      })
    );
  });

  it("should handle search results and format context", async () => {
    const mockSources = [
      {
        task_id: "1",
        content: "Completar informe. Prioridad: alta. Estado: todo",
        similarity: 0.85,
      },
      {
        task_id: "2",
        content: "Revisar código. Prioridad: media. Estado: in_progress",
        similarity: 0.75,
      },
    ];

    vi.mocked(searchModule.searchTasks).mockResolvedValue(mockSources);

    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "Tienes 2 tareas: completar informe y revisar código.",
        },
      ],
    });

    const result = await chatWithTasks("¿qué tareas tengo pendientes?");

    expect(result.answer).toBe(
      "Tienes 2 tareas: completar informe y revisar código."
    );
    expect(result.sources).toEqual(mockSources);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("[1] Completar informe"),
      })
    );
  });

  it("should propagate search errors", async () => {
    vi.mocked(searchModule.searchTasks).mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(chatWithTasks("test query")).rejects.toThrow(
      "Database connection failed"
    );
  });

  it("should handle Anthropic API errors", async () => {
    vi.mocked(searchModule.searchTasks).mockResolvedValue([]);

    mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

    await expect(chatWithTasks("test query")).rejects.toThrow(
      "API rate limit exceeded"
    );
  });

  it("should throw error for non-text response", async () => {
    vi.mocked(searchModule.searchTasks).mockResolvedValue([]);

    mockCreate.mockResolvedValue({
      content: [{ type: "image", source: {} }],
    });

    await expect(chatWithTasks("test query")).rejects.toThrow(
      "Unexpected response type"
    );
  });
});
