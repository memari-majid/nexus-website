import { describe, expect, it } from "vitest";
import { recommendWorkshop, type CatalogWorkshop } from "@/lib/recommend";

const CATALOG: CatalogWorkshop[] = [
  {
    key: "agentic-llm",
    title: "Building Agentic AI Applications With LLMs",
    url: "https://learn.nvidia.com/agentic",
    blurb: "Agents, tool use, LangGraph, multi-agent workflows.",
    hosted: true,
    keywords: ["agent", "agentic", "llm app", "langgraph", "tool use", "multi-agent"],
  },
  {
    key: "knowledge-rag",
    title: "Adding New Knowledge to LLMs",
    url: "https://learn.nvidia.com/rag",
    blurb: "Retrieval, RAG, grounding models in your data.",
    keywords: ["rag", "retrieval", "knowledge", "embedding", "vector", "grounding"],
  },
  {
    key: "multimodal",
    title: "Building AI Agents with Multimodal Models",
    url: "https://learn.nvidia.com/multimodal",
    blurb: "Vision, images, and video with multimodal models.",
    keywords: ["multimodal", "image", "vision", "video"],
  },
  {
    key: "inference",
    title: "Deploying and Optimizing AI Inference at Scale",
    url: "https://learn.nvidia.com/inference",
    blurb: "Serving, latency, throughput, cost at scale.",
    keywords: ["inference", "deploy", "scale", "latency", "throughput", "serving", "optimize"],
  },
];

describe("recommendWorkshop", () => {
  it("recommends the agentic workshop for agent/tool-calling needs", () => {
    const r = recommendWorkshop({ need: "We want to build LLM agents that call tools" }, CATALOG);
    expect(r.workshop.key).toBe("agentic-llm");
    expect(r.hosted).toBe(true);
    expect(r.why).toContain(r.workshop.title);
  });

  it("recommends the RAG workshop for retrieval over internal docs", () => {
    const r = recommendWorkshop({ need: "We need RAG retrieval over our internal docs" }, CATALOG);
    expect(r.workshop.key).toBe("knowledge-rag");
    expect(r.hosted).toBe(false);
  });

  it("recommends the multimodal workshop for image and video work", () => {
    const r = recommendWorkshop({ need: "We process images and video" }, CATALOG);
    expect(r.workshop.key).toBe("multimodal");
  });

  it("recommends the inference workshop for deployment at scale", () => {
    const r = recommendWorkshop(
      { need: "We must deploy models at scale with low latency" },
      CATALOG,
    );
    expect(r.workshop.key).toBe("inference");
  });

  it("defaults to the hosted flagship when nothing matches", () => {
    const r = recommendWorkshop({ need: "just curious about your company" }, CATALOG);
    expect(r.workshop.key).toBe("agentic-llm");
    expect(r.hosted).toBe(true);
  });

  it("offers alternatives that exclude the pick", () => {
    const r = recommendWorkshop({ need: "agents" }, CATALOG);
    expect(r.alternatives.map((w) => w.key)).not.toContain(r.workshop.key);
    expect(r.alternatives.length).toBeGreaterThan(0);
  });

  it("combines role, level, and free text when scoring", () => {
    const r = recommendWorkshop(
      { role: "MLOps engineer", need: "reduce serving cost", level: "advanced" },
      CATALOG,
    );
    expect(r.workshop.key).toBe("inference");
  });
});
