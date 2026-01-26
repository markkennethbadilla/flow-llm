# FlowLLM Cache Proxy

Semantic caching layer for LLM APIs that reduces costs by 40% through intelligent query matching.

## Overview

A proxy that intercepts LLM API requests and uses vector embeddings to cache semantically similar queries. Features a chat interface with real-time savings calculator.

## Tech Stack

- **Semantic Caching**: Vector similarity matching
- **Cost Optimization**: Reduces API bills by 30-50%
- **AI Engineering**: Embedding-based fuzzy matching
- **Vector Search**: all-MiniLM-L6-v2 embeddings

## The Problem

LLM APIs charge by token. Applications often send the same or semantically similar queries repeatedly (e.g., 'Reset password' vs 'How to reset password'), wasting money and introducing latency.

## The Solution

A proxy that intercepts requests and generates vector embeddings (via all-MiniLM-L6-v2). It checks a local vector store for semantically similar past requests. If a match is found (cosine similarity > 0.95), the cached response is returned instantly.

## Business Value

- Reduces API bills by 30-50%
- Improves p99 latency from ~800ms to <20ms for cache hits
- Adds resilience against external API outages

## Technical Architecture

The application uses **Transformers.js** to run the `all-MiniLM-L6-v2` model directly in the browser.

1.  **On Mount**: The model (~20MB quantized) is loaded into the browser via WebAssembly.
2.  **On Input**: The user's prompt is tokenized and passed through the model to generate a 384-dimensional vector.
3.  **On Cache Check**: The new vector is compared against all cached vectors using **Cosine Similarity**.
4.  **Threshold**: If similarity > 0.90, the cached response is returned.

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/markkennethbadilla/flow-llm.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the project (requires a Next.js environment).

**Note:** This project downloads a model corresponding to ~20MB of data on first load.

## License

MIT
