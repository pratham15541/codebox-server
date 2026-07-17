# CodeBox Server

Express.js API for CodeBox — user authentication, code project CRUD, and LangChain-powered AI code explanation.

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default `8000`) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `PINECONE_API_KEY` | Yes | Pinecone API key |
| `PINECONE_INDEX` | No | Index name (default `codebox-code-chunks`) |
| `PINECONE_CLOUD` | No | Pinecone cloud provider (default `aws`) |
| `PINECONE_REGION` | No | Pinecone region (default `us-east-1`) |
| `AI_API_KEY` | Yes | OpenAI-compatible API key |
| `AI_MODEL` | Yes | Chat model name |
| `AI_BASE_URL` | Yes | OpenAI-compatible base URL |
| `EMBEDDING_MODEL` | No | Embedding model (default `text-embedding-3-small`) |
| `EMBEDDING_DIMENSION` | No | Vector dimension (default `1536`, use `1024` for NVIDIA embed) |
| `CHUNK_SIZE` | No | Max characters per chunk (default `800`) |
| `CHUNK_OVERLAP` | No | Overlap for line-based splits (default `120`) |
| `RETRIEVAL_TOP_K` | No | Candidates per retriever (default `6`) |
| `RERANK_TOP_K` | No | Final chunks after rerank (default `4`) |

## Chat Routes

All routes require `Authorization: Bearer <JWT>`.

### `POST /api/chat`

Send a message and receive an AI explanation.

**Body**

```json
{
  "message": "Explain this code",
  "codeId": "optional-saved-code-id",
  "sessionId": "optional-existing-session",
  "codeSnippet": "optional live editor code",
  "language": "javascript"
}
```

### `POST /api/chat/index`

Chunk and vector-index a saved code project into Pinecone.

**Body:** `{ "codeId": "..." }`

### `GET /api/chat/sessions`

List chat sessions for the authenticated user.

### `GET /api/chat/messages?sessionId=...`

Get all messages in a session.

### `GET /api/chat/chunks?codeId=...`

View indexed chunks for a code project.

## Project Structure

```
codebox-server/
├── controllers/chatController.js   # Chat HTTP handlers
├── models/
│   ├── CodeChunk.model.js          # Indexed code chunks
│   ├── ChatSession.model.js        # Chat sessions
│   └── ChatMessage.model.js        # Messages + retrieval metadata
├── services/
│   ├── ai/config.js                # LLM + embedding clients
│   ├── chunking.js                 # Semantic code chunking
│   ├── indexing.js                 # Index pipeline
│   ├── pineconeStore.js            # Pinecone vector store
│   ├── chat/chain.js               # LangChain orchestration
│   └── retrieval/hybridRetriever.js # BM25 + vector + rerank
└── routers/route.js
```

## Hybrid Retrieval Pipeline

1. **Chunk** saved code into functions, classes, imports (line fallback with overlap)
2. **Embed** chunks and store in Pinecone; metadata in MongoDB
3. On chat query:
   - **BM25** search over in-memory chunk documents
   - **Vector** similarity search in Pinecone (filtered by `codeId`)
   - **Reciprocal Rank Fusion** to merge results
   - **LLM reranking** to pick the best context
4. **LangChain** prompt chain sends context + history to the LLM
