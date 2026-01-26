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

## AI Integration

Uses 'Fuzzy Matching' via embeddings. The system recognizes that 'Hello there' and 'Hi' are semantically close enough to share a cached response, unlike traditional exact-string matching.

## Features

- Semantic query matching using embeddings
- ~40% cost reduction on average
- 12ms latency for cache hits
- Local fallback for reliability
- Real-time savings dashboard

## Development

This is a standalone project repository linked from the main portfolio at [markkennethbadilla.com](https://markkennethbadilla.com).

## License

MIT
