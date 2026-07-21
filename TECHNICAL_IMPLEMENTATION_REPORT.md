# HR Policy AI Assistant: Technical Implementation Report

This report explains the project as implemented in code. It intentionally avoids guessing. Where the requested topic is not present in the codebase, that absence is called out directly.

## 1. Project Overview

The application is an HR policy assistant with a React frontend and a FastAPI backend. Users can open a chatbot, ask HR-policy questions, and receive answers generated from uploaded policy documents through a retrieval-augmented generation flow. Admin-facing screens let a user upload policy files and manage local UI state for policies, categories, settings, and chat logs.

High-level architecture:

```text
Browser / React frontend
  ↓ HTTP via axios
FastAPI backend
  ↓ file upload bytes
Supabase Storage bucket
  ↓ extracted text → chunks → Gemini embeddings
Chroma persistent vector database
  ↓ retrieved chunks
Gemini 2.5 Flash
  ↓ answer + source chunks
React chatbot UI
```

Technologies used:

- Frontend: React 19, Vite, React Router, axios, Tailwind CSS, lucide-react icons.
- Backend: FastAPI, Uvicorn, python-dotenv, Pydantic request validation.
- AI: Google GenAI SDK. `gemini-embedding-001` creates embeddings, and `gemini-2.5-flash` generates chatbot answers.
- Vector database: ChromaDB `PersistentClient`, stored under `backend/vectordb`.
- Document parsing: `langchain_community.document_loaders.PyPDFLoader` for PDFs, `python-docx` for DOCX, and a basic byte/regex extractor for legacy `.doc` files.
- File storage: Supabase Storage. The code uploads original policy files to a Supabase bucket.
- Metadata persistence: local JSON registry at `backend/vectordb/policies.json`.
- Authentication: no real login/session/admin authentication is implemented in the current code.

Important distinction: Supabase is used as object storage only in `backend/services/supabase_storage.py`. There are no Supabase database-table reads/writes in this codebase. Policy metadata is stored in a local JSON file through `backend/services/policy_registry.py`.

## 2. Startup Flow

### Backend startup

The backend entry point is `backend/app.py`.

Execution order:

```text
Uvicorn imports backend/app.py
  ↓
load_dotenv()
  ↓
FastAPI app is created
  ↓
CORS middleware is configured
  ↓
policy and chatbot routers are registered
  ↓
startup event warms Chroma vector store
```

`backend/app.py` imports `load_dotenv` and calls it near startup. This loads environment variables from `.env` before services need them. The detected environment keys in `backend/.env` are:

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

The FastAPI app is created in `backend/app.py` as:

```python
app = FastAPI(title="HR Policy Assistant API")
```

CORS is configured in the same file. Default frontend origins include local Vite addresses and several deployed Vercel URLs. Additional origins can be added with `CORS_ORIGINS`, parsed as a comma-separated environment variable.

Routes are registered with:

```python
app.include_router(policies_router)
app.include_router(chatbot_router)
```

The policy router comes from `backend/routes/upload.py`, mounted at `/api/policies`. The chatbot router comes from `backend/routes/chatbot.py`, mounted at `/api`.

On startup, `warm_vector_store()` in `backend/app.py` calls `get_document_count()` from `backend/services/vector_store.py`. That call initializes the Chroma client and collection if needed, then prints how many indexed chunks exist.

### Frontend startup

The frontend entry point is `frontend/src/main.jsx`.

Execution order:

```text
Vite serves frontend/index.html
  ↓
src/main.jsx runs
  ↓
React root is created on #root
  ↓
App is rendered inside StrictMode
  ↓
BrowserRouter creates client-side routing
  ↓
Navbar, page route, and Chatbot are rendered
```

`frontend/src/App.jsx` defines the main route tree:

- `/` renders `Home`.
- `/admin` renders `AdminDashboard`.
- `/admin/dashboard` renders `AdminDashboard.Overview`.
- `/admin/upload` renders `UploadPolicy`.
- `/admin/policies` renders `ExistingPolicies`.
- `/admin/categories` renders `Categories`.
- `/admin/chat-logs` renders `ChatLogs`.
- `/admin/settings` renders `Settings`.

`Chatbot` is rendered outside the route switch, so the floating chatbot is available across pages.

### Environment and service initialization

The frontend API base URL is created in `frontend/src/services/api.js`:

```text
VITE_API_BASE_URL if set
  ↓ fallback
http://localhost:8000
```

The backend initializes external clients lazily:

- Gemini embedding client is created inside `generate_embeddings()` in `backend/services/embeddings.py`.
- Gemini answer-generation client is created inside `answer_question()` in `backend/services/rag.py`.
- Supabase client is created lazily in `get_supabase_client()` in `backend/services/supabase_storage.py` and cached with `lru_cache`.
- Chroma client is created lazily in `get_client()` in `backend/services/vector_store.py` and cached with `lru_cache`.

## 3. User Authentication Flow

No actual user authentication flow exists in this project.

What is implemented:

- The navbar has an `Admin` link in `frontend/src/components/Navbar.jsx`.
- Clicking it routes to `/admin`.
- `frontend/src/App.jsx` renders admin routes directly.
- `frontend/src/pages/Home.jsx` includes marketing text saying “Mock admin and employee views,” but this is only UI copy.

What is not implemented:

- No login form.
- No session token.
- No Supabase Auth usage.
- No JWT validation.
- No cookies.
- No `Authorization` header handling.
- No FastAPI dependency such as `Depends(...)` to verify users.
- No protected-route component in React.
- No backend admin middleware.

Therefore, admin pages and backend endpoints are publicly callable by anyone who can reach the app/API.

## 4. Admin Workflow

The implemented admin workflow begins when a user clicks the `Admin` button in `Navbar`.

```text
User clicks Admin
  ↓
React Router navigates to /admin
  ↓
AdminDashboard renders Sidebar and nested Outlet
  ↓
/admin redirects to /admin/dashboard
  ↓
User selects Upload Policy
  ↓
UploadPolicy renders UploadForm
```

Files involved:

- `frontend/src/components/Navbar.jsx`: renders the `Admin` navigation link.
- `frontend/src/App.jsx`: defines `/admin` and nested admin routes.
- `frontend/src/pages/AdminDashboard.jsx`: renders the admin layout with `Sidebar` and `Outlet`.
- `frontend/src/components/Sidebar.jsx`: provides admin navigation.
- `frontend/src/pages/UploadPolicy.jsx`: renders the upload page and success toast.
- `frontend/src/components/UploadForm.jsx`: handles upload form state, validation, `FormData`, and API call.

There is no authentication step in code before the admin page opens.

### Upload form

`UploadForm` maintains:

- `form`: policy name, department, category, description.
- `file`: selected PDF/DOC/DOCX file.
- `error`: user-facing validation error.
- `uploading`: upload in-progress state.
- `progress`: browser upload progress percentage.

Categories are loaded from local browser storage through `storage.getCategories()` in `frontend/src/services/localStorageService.js`.

When a file is selected, `handleFile()` in `UploadForm` checks either MIME type or file extension. Allowed extensions are `.pdf`, `.doc`, and `.docx`.

When the form is submitted:

```text
handleSubmit()
  ↓
validate fields and file
  ↓
create FormData
  ↓
append policy_name, department, category, description, file
  ↓
uploadPolicy(formData, progress callback)
```

`uploadPolicy()` in `frontend/src/services/api.js` sends a `POST` request to:

```text
/api/policies/upload
```

with `Content-Type: multipart/form-data`.

### Backend upload

The backend route is `upload_policy()` in `backend/routes/upload.py`.

Execution order:

```text
Generate policy_id with uuid4()
  ↓
_prepare_upload(file, policy_id)
  ↓
upload original bytes to Supabase Storage
  ↓
extract text from temp file
  ↓
chunk extracted text
  ↓
generate Gemini embeddings
  ↓
add chunks + embeddings + metadata to Chroma
  ↓
add policy metadata to local JSON registry
  ↓
return success response
```

`_prepare_upload()`:

- Validates the file suffix against `SUPPORTED_SUFFIXES` from `document_loader.py`.
- Creates `backend/tmp_uploads`.
- Sanitizes the original filename with `Path(...).name`.
- Creates a Supabase object path:

```text
policies/{policy_id}/{safe_original_filename}
```

- Reads uploaded bytes from `UploadFile.file`.
- Writes those bytes to a temporary local file for parsing.

The original file bytes are uploaded to Supabase Storage through `upload_policy_file()` in `backend/services/supabase_storage.py`.

After processing, a metadata record is created by `add_policy()` in `backend/services/policy_registry.py`. That function adds an `upload_date` timestamp and writes the record to `backend/vectordb/policies.json`.

The frontend then stores a UI copy of the returned policy in browser `localStorage` through `storage.addPolicy()`. This local copy powers some admin UI counters and tables, but it is separate from the backend registry.

## 5. Document Processing Pipeline

Implemented pipeline:

```text
File Upload
  ↓
Suffix validation
  ↓
Temporary file write
  ↓
Supabase Storage upload
  ↓
Text extraction
  ↓
Chunking
  ↓
Metadata creation
  ↓
Embedding generation
  ↓
Vector database storage
  ↓
Local JSON registry write
  ↓
Ready for querying
```

### File Upload

Frontend file:

- `frontend/src/components/UploadForm.jsx`

Backend file:

- `backend/routes/upload.py`

Input:

- `policy_name`
- `department`
- `category`
- `description`
- uploaded file

Output:

- Raw file bytes in memory.
- Temporary local file in `backend/tmp_uploads`.
- Supabase storage path.

Why this step exists: the backend needs the original bytes both to preserve the uploaded document in object storage and to parse the document locally.

### Text Extraction

File:

- `backend/services/document_loader.py`

Functions:

- `load_document(file_path)`
- `load_pdf(file_path)`
- `load_docx(file_path)`
- `load_doc(file_path)`
- `_validate_file(file_path, expected_suffix=None)`
- `_ensure_text(text, path)`

Input:

- Temporary file path.

Output:

- Extracted plain text string.

Behavior:

- PDFs are read with `PyPDFLoader`.
- DOCX files are read with `python-docx`.
- DOC files are read as bytes and decoded using `utf-16le` and `latin-1`, then filtered with a regex for text-like spans.

If no text is found, `_ensure_text()` raises an error.

### Cleaning

There is no separate cleaning module. Cleaning is minimal and happens during extraction:

- PDF page content is stripped before joining.
- DOCX paragraph text is stripped and empty paragraphs are ignored.
- DOC text candidates are stripped and deduplicated.

### Chunking

File:

- `backend/services/chunker.py`

Function:

- `create_chunks(text)`

Input:

- Extracted text string.

Output:

- List of text chunks.

Implementation:

```text
RecursiveCharacterTextSplitter
  chunk_size = 800
  chunk_overlap = 150
  length_function = len
```

Why this step exists: Gemini receives only the most relevant pieces at answer time. Chunking creates searchable units for vector retrieval.

### Metadata creation

File:

- `backend/routes/upload.py`

Metadata sent to Chroma:

```json
{
  "policy_id": "...",
  "policy_name": "...",
  "department": "...",
  "category": "...",
  "file_name": "..."
}
```

`add_documents()` in `backend/services/vector_store.py` adds `chunk_index` to each chunk metadata object.

Policy registry metadata:

```json
{
  "id": "...",
  "policy_name": "...",
  "department": "...",
  "category": "...",
  "description": "...",
  "file_name": "...",
  "storage_path": "...",
  "chunk_count": 2,
  "upload_date": "..."
}
```

### Embedding generation

File:

- `backend/services/embeddings.py`

Function:

- `generate_embeddings(text_chunks)`

Input:

- A string or list of strings.

Output:

- List of embedding vectors.

Implementation:

```text
GEMINI_API_KEY from environment
  ↓
genai.Client(api_key)
  ↓
client.models.embed_content(model="gemini-embedding-001", contents=text_chunks)
  ↓
[embedding.values ...]
```

If `GEMINI_API_KEY` is missing, the function raises `RuntimeError`.

### Vector database storage

File:

- `backend/services/vector_store.py`

Function:

- `add_documents(chunks, embeddings, metadata)`

Input:

- Chunks.
- Matching embedding vectors.
- Shared policy metadata.

Output:

- Chroma document IDs.

IDs are generated as:

```text
{policy_id}:{chunk_index}:{uuid4_hex}
```

Each Chroma record stores:

- `id`
- text chunk as `document`
- embedding vector
- metadata including `chunk_index`

### Supabase storage

File:

- `backend/services/supabase_storage.py`

Function:

- `upload_policy_file(storage_path, file_bytes, file_name)`

Input:

- Supabase object path.
- Original uploaded bytes.
- Original filename.

Output:

- Supabase SDK upload response.

The default bucket is `policy-documents`, unless overridden by `SUPABASE_STORAGE_BUCKET`.

### Ready for querying

Once Chroma has embeddings and `policies.json` has the policy metadata, the chatbot can retrieve chunks from the vector store.

## 6. Vector Database

The vector database is ChromaDB.

File:

- `backend/services/vector_store.py`

Persistent location:

```text
backend/vectordb
```

Collection name:

```text
policies
```

Collection creation:

```text
get_client()
  ↓
chromadb.PersistentClient(path=backend/vectordb)
  ↓
get_collection()
  ↓
get_or_create_collection(name="policies", metadata={"hnsw:space": "cosine"})
```

The `lru_cache(maxsize=1)` decorators cache the Chroma client and collection for the life of the backend process.

Documents are indexed in `add_documents()`:

```text
chunks + embeddings + metadata
  ↓
ids = policy_id:chunk_index:random_uuid
  ↓
metadatas = shared metadata + chunk_index
  ↓
collection.add(...)
```

Similarity search happens in `search_documents(query_embedding, top_k=5)`:

```text
collection.query(
  query_embeddings=[query_embedding],
  n_results=top_k,
  include=["documents", "metadatas", "distances"]
)
  ↓
score = 1 - distance
```

Duplicate handling:

- There is no semantic duplicate-upload check.
- Each upload receives a new `policy_id`.
- Each chunk ID includes a random UUID.
- Therefore, uploading the same file multiple times creates multiple indexed policy records.

Deletion:

- `delete_policy_documents(policy_id)` calls `collection.delete(where={"policy_id": policy_id})`.

Persistence and reload:

- Chroma persists vectors in `backend/vectordb`.
- On server restart, `get_client()` points Chroma to the same directory.
- `warm_vector_store()` calls `get_document_count()`, which opens the persisted collection.

Embedding dimension mismatch:

- `vector_store.py` detects Chroma errors matching “expecting embedding with dimension X, got Y.”
- `_handle_dimension_error()` deletes the Chroma collection and raises `EmbeddingDimensionMismatchError`.
- This protects the app from using an old index with a new embedding model, but it also means documents must be re-uploaded after the old index is cleared.

## 7. Chatbot Workflow

The chatbot component is always mounted by `frontend/src/App.jsx`.

End-to-end request flow:

```text
User opens chatbot
  ↓
User types question
  ↓
Chatbot.handleSubmit()
  ↓
askPolicyQuestion(question)
  ↓
POST /api/chat
  ↓
FastAPI chatbot route
  ↓
static greeting/policy filter
  ↓
RAG answer flow
  ↓
query embedding
  ↓
Chroma similarity search
  ↓
prompt construction
  ↓
Gemini generation
  ↓
answer + source chunks returned
  ↓
frontend renders answer
  ↓
chat log saved to localStorage
```

### Frontend request

File:

- `frontend/src/components/Chatbot.jsx`

Function:

- `handleSubmit(event)`

Steps:

1. Prevent default form submit.
2. Trim `input`.
3. Ignore empty input or concurrent request.
4. Add the user message to React state.
5. Clear the input.
6. Set `loading` to true.
7. Call `askPolicyQuestion(query)`.

`askPolicyQuestion()` is defined in `frontend/src/services/api.js`:

```text
POST /api/chat
body: { "question": "..." }
```

### Backend API

File:

- `backend/routes/chatbot.py`

Class:

- `ChatRequest`

Route:

- `POST /api/chat`

`ChatRequest` validates that `question` is a non-empty string.

The route first calls `get_static_response(question)` from `backend/services/rag.py`. If that returns a string, the backend immediately responds:

```json
{
  "answer": "...",
  "sources": []
}
```

Otherwise it calls `answer_question(question)`.

### Static filtering

File:

- `backend/services/rag.py`

Functions:

- `_normalize_question(question)`
- `_is_greeting(question)`
- `_is_policy_related(question)`
- `get_static_response(question)`

Behavior:

- Greetings such as “hi” or “good morning” return a fixed greeting.
- Questions with no overlap against `POLICY_KEYWORDS` return the fixed fallback answer.
- Policy-related questions continue into RAG.

This filter exists to avoid calling Gemini for simple greetings and obviously unrelated questions.

### Query embedding

File:

- `backend/services/retriever.py`

Function:

- `retrieve_relevant_chunks(question, top_k=5)`

Execution:

```text
generate_embeddings(question)
  ↓
take first embedding vector
  ↓
search_documents(query_embedding, top_k=5)
```

### Similarity search

File:

- `backend/services/vector_store.py`

Function:

- `search_documents(query_embedding, top_k=5)`

Chroma returns up to five records, including documents, metadata, and distances. The backend converts those into:

```json
{
  "chunk": "...",
  "metadata": {
    "policy_id": "...",
    "policy_name": "...",
    "department": "...",
    "category": "...",
    "file_name": "...",
    "chunk_index": 0
  },
  "score": 0.82
}
```

### Prompt construction

File:

- `backend/services/rag.py`

Function:

- `_build_prompt(context, question)`

The context is created by joining retrieved chunks with:

```text

---

```

The prompt instructs Gemini to:

- Act as an HR Policy Assistant.
- Use a polite, formal tone.
- Answer only from the provided policy context.
- Return exact fallback responses for unrelated or missing-policy cases.

### Gemini API

File:

- `backend/services/rag.py`

Function:

- `answer_question(question)`

Generation call:

```text
genai.Client(api_key=GEMINI_API_KEY)
  ↓
client.models.generate_content(
  model="gemini-2.5-flash",
  contents=_build_prompt(context, question)
)
```

Return shape:

```json
{
  "answer": "response.text or fallback",
  "sources": [
    {
      "chunk": "...",
      "metadata": {...},
      "score": 0.82
    }
  ]
}
```

### Frontend rendering

`Chatbot.jsx` reads `result.data.answer` and appends it to local React state as a bot message. It also calls:

```text
storage.addChatLog({ query, response, timestamp })
```

That writes the chat log to browser `localStorage`. Although the backend returns `sources`, `Chatbot.jsx` does not render source citations or metadata in the current UI.

## 8. Retrieval-Augmented Generation

RAG is implemented across these files:

- `backend/services/embeddings.py`
- `backend/services/retriever.py`
- `backend/services/vector_store.py`
- `backend/services/rag.py`

Index-time embedding flow:

```text
Uploaded policy text
  ↓
create_chunks()
  ↓
generate_embeddings(chunks)
  ↓
add_documents(chunks, embeddings, metadata)
```

Query-time embedding flow:

```text
User question
  ↓
generate_embeddings(question)
  ↓
search_documents(query_embedding, top_k=5)
```

Top-k retrieval:

- `retrieve_relevant_chunks(question, top_k=5)` defaults to five chunks.
- `answer_question()` calls it with `top_k=5`.

Metadata filtering:

- The current query path does not apply department/category/policy filters.
- It searches the whole Chroma `policies` collection.
- Metadata is returned for citations/traceability but is not used to restrict retrieval.

Prompt engineering:

- The prompt forces answers to come only from retrieved context.
- It gives exact fallback strings for missing or unrelated information.
- It includes only retrieved chunks rather than the full document corpus.

Why hallucinations are reduced:

- The model receives policy snippets retrieved from Chroma instead of being asked from general knowledge.
- Unrelated questions are filtered before generation.
- The prompt explicitly forbids using general knowledge.

Limits:

- The backend does not verify that Gemini actually cites or follows all instructions.
- The frontend does not display returned source chunks.
- There is no relevance threshold; even weak matches may be passed to Gemini.

## 9. Database Structure

There are three persistence layers in the implemented project.

### Chroma vector database

Location:

```text
backend/vectordb
```

Collection:

```text
policies
```

Stored per chunk:

- Chroma ID: `{policy_id}:{chunk_index}:{uuid4_hex}`
- Document text chunk.
- Embedding vector.
- Metadata: `policy_id`, `policy_name`, `department`, `category`, `file_name`, `chunk_index`.

### Local policy registry

File:

- `backend/vectordb/policies.json`

Managed by:

- `backend/services/policy_registry.py`

Stored per policy:

- `id`
- `policy_name`
- `department`
- `category`
- `description`
- `file_name`
- `storage_path` for newer Supabase-backed uploads
- `stored_file_name` for older local-upload records already present in the file
- `chunk_count`
- `upload_date`

### Supabase Storage

File:

- `backend/services/supabase_storage.py`

Bucket:

- `SUPABASE_STORAGE_BUCKET` if configured.
- Otherwise `policy-documents`.

Object path:

```text
policies/{policy_id}/{original_file_name}
```

There are no Supabase database tables used by this code.

### Browser localStorage

File:

- `frontend/src/services/localStorageService.js`

Keys:

- `policy-ai-policies`
- `policy-ai-categories`
- `policy-ai-chat-history`
- `policy-ai-chat-logs`
- `policy-ai-settings`

This storage is client-side only. It is not synchronized with the backend except that upload success adds a frontend copy of the returned policy.

## 10. API Endpoints

### `GET /api/health`

File:

- `backend/app.py`

Response:

```json
{ "status": "ok" }
```

Purpose: basic API health check.

### `POST /api/chat`

File:

- `backend/routes/chatbot.py`

Request:

```json
{ "question": "What are the working hours?" }
```

Response:

```json
{
  "answer": "...",
  "sources": [...]
}
```

Purpose: answer a user question through static filtering and RAG.

### `POST /api/policies/upload`

File:

- `backend/routes/upload.py`

Request:

```text
multipart/form-data
  policy_name: string
  department: string
  category: string
  description: string
  file: PDF/DOC/DOCX
```

Response:

```json
{
  "success": true,
  "message": "Policy uploaded successfully",
  "policy": {
    "id": "...",
    "policy_name": "...",
    "department": "...",
    "category": "...",
    "description": "...",
    "file_name": "...",
    "storage_path": "...",
    "chunk_count": 2,
    "upload_date": "..."
  }
}
```

Purpose: upload, store, parse, chunk, embed, index, and register a policy document.

### `GET /api/policies`

File:

- `backend/routes/upload.py`

Response:

```json
{ "policies": [...] }
```

Purpose: list policy metadata from `backend/vectordb/policies.json`.

Note: `frontend/src/services/api.js` defines `listPolicies()`, but the current React pages do not use it for the existing-policies table.

### `GET /api/policies/{policy_id}`

File:

- `backend/routes/upload.py`

Response:

```json
{ "policy": {...} }
```

Errors:

- `404` if the policy ID is not in the JSON registry.

Purpose: fetch one policy metadata record.

### `DELETE /api/policies/{policy_id}`

File:

- `backend/routes/upload.py`

Response:

```json
{
  "success": true,
  "message": "Policy deleted successfully"
}
```

Execution:

```text
get_policy(policy_id)
  ↓
delete Supabase object if storage_path exists
  ↓
delete Chroma chunks by policy_id
  ↓
delete local registry record
```

Purpose: remove a policy from storage, vector index, and local metadata.

Note: `frontend/src/services/api.js` defines `deletePolicy(id)`, but `PolicyTable.jsx` deletes only the browser `localStorage` copy and does not call the backend endpoint.

## 11. Frontend Architecture

The frontend is a Vite React app.

Entry files:

- `frontend/index.html`: Vite HTML shell.
- `frontend/src/main.jsx`: creates the React root.
- `frontend/src/App.jsx`: defines layout and routing.
- `frontend/src/index.css`: imports Tailwind and base styles.
- `frontend/vite.config.js`: configures React, Tailwind, and React compiler Babel plugin.

Routing:

- Implemented with `react-router-dom`.
- `BrowserRouter` wraps the app.
- Admin pages are nested under `/admin`.

Main pages:

- `Home.jsx`: public landing page.
- `AdminDashboard.jsx`: admin layout and dashboard overview.
- `UploadPolicy.jsx`: upload page.
- `ExistingPolicies.jsx`: policy table page.
- `Categories.jsx`: local category management.
- `ChatLogs.jsx`: local chat logs.
- `Settings.jsx`: local company/admin settings.

Reusable components:

- `Navbar.jsx`: top navigation.
- `Sidebar.jsx`: admin navigation.
- `Chatbot.jsx`: floating chatbot panel.
- `UploadForm.jsx`: upload form and API integration.
- `PolicyTable.jsx`: local policy list, filter, view, edit, delete.
- `DashboardCards.jsx`: local dashboard stats.
- `Modal.jsx`: modal wrapper.
- `Toast.jsx`: success notification.

State management:

- React `useState`, `useEffect`, `useMemo`, and `useRef`.
- No Redux, Zustand, React Query, or context provider.
- Browser `localStorage` is wrapped in `frontend/src/services/localStorageService.js`.

API communication:

- `frontend/src/services/api.js` creates an axios instance.
- Upload and chat use real backend calls.
- `listPolicies()` and backend `deletePolicy()` exist but are not used by current admin table code.

Chat interface:

- `Chatbot.jsx` stores messages in component state.
- It sends only the question to the backend.
- It renders only the answer text.
- It saves chat logs in browser `localStorage`.
- It does not render backend `sources`.

Admin interface:

- `UploadForm.jsx` calls the backend upload API.
- `PolicyTable.jsx`, `DashboardCards.jsx`, `Categories.jsx`, `ChatLogs.jsx`, and `Settings.jsx` primarily use `localStorage`.
- There is no auth guard around admin pages.

## 12. Backend Architecture

Backend entry:

- `backend/app.py`

Routes:

- `backend/routes/upload.py`: policy upload/list/get/delete endpoints.
- `backend/routes/chatbot.py`: chat endpoint.

Services:

- `document_loader.py`: document validation and text extraction.
- `chunker.py`: LangChain text splitting.
- `embeddings.py`: Gemini embedding generation.
- `vector_store.py`: Chroma client, collection, add/search/delete logic.
- `retriever.py`: query embedding plus vector search.
- `rag.py`: static response filters, prompt construction, Gemini generation.
- `policy_registry.py`: local JSON metadata persistence.
- `supabase_storage.py`: Supabase Storage client and file upload/delete.

Utilities/middleware:

- CORS middleware is configured in `app.py`.
- Pydantic request validation is used in `routes/chatbot.py`.
- No custom authentication middleware exists.

## 13. End-to-End Data Flow

Complete upload-to-answer flow:

```text
Admin selects PDF/DOC/DOCX in UploadForm
  ↓
UploadForm validates fields and file extension/MIME
  ↓
UploadForm creates FormData
  ↓
frontend/services/api.uploadPolicy()
  ↓
POST /api/policies/upload
  ↓
routes/upload.upload_policy()
  ↓
uuid4() creates policy_id
  ↓
_prepare_upload() validates suffix, writes temp file, builds storage_path
  ↓
supabase_storage.upload_policy_file() uploads original file
  ↓
document_loader.load_document() extracts text
  ↓
chunker.create_chunks() creates 800-character chunks with 150 overlap
  ↓
embeddings.generate_embeddings() calls Gemini embedding model
  ↓
vector_store.add_documents() writes chunks, embeddings, metadata to Chroma
  ↓
policy_registry.add_policy() writes metadata to policies.json
  ↓
Backend returns uploaded policy metadata
  ↓
UploadForm stores a UI copy in browser localStorage
  ↓
User opens Chatbot and asks a question
  ↓
Chatbot calls askPolicyQuestion()
  ↓
POST /api/chat
  ↓
routes/chatbot.chat() validates request
  ↓
rag.get_static_response() handles greetings/unrelated questions
  ↓
rag.answer_question() checks Chroma document count
  ↓
retriever.retrieve_relevant_chunks() embeds the question
  ↓
vector_store.search_documents() retrieves top 5 chunks
  ↓
rag._build_prompt() combines context and question
  ↓
Gemini 2.5 Flash generates answer
  ↓
Backend returns answer and source chunk objects
  ↓
Chatbot renders answer text
  ↓
Chatbot saves query/response log to localStorage
```

## 14. Folder Responsibility

`backend/`

- Owns API routes, document processing, AI calls, vector indexing, Supabase Storage integration, and local metadata registry.

`backend/routes/`

- Defines public HTTP API endpoints.
- `upload.py` handles policy CRUD/upload.
- `chatbot.py` handles chat requests.

`backend/services/`

- Holds backend business logic and external integrations.
- Each service is focused on one responsibility: extraction, chunking, embedding, retrieval, storage, registry, or RAG.

`backend/documents/`

- Contains sample DOCX policy files. The current upload route does not automatically ingest this folder.
- `load_all_documents()` can load PDFs/DOCX files from this folder, but it is not called by startup or routes.

`backend/processed/`

- Contains `chunks.json`, but it is empty in the inspected project and not referenced by active code.

`backend/tmp_uploads/`

- Temporary upload directory created by `_prepare_upload()`.
- Temp files are deleted in the `finally` block after upload processing.

`backend/uploads/`

- Contains older local uploaded files.
- Current upload code stores original files in Supabase, not this folder.

`backend/vectordb/`

- Contains Chroma persistent files and `policies.json`.

`frontend/`

- Owns the browser UI.

`frontend/src/components/`

- Reusable UI components for navigation, admin UI, forms, modals, toast, dashboard cards, policy table, and chatbot.

`frontend/src/pages/`

- Route-level screens.

`frontend/src/services/`

- API client and localStorage wrapper.

`frontend/public/`

- Static icons/favicon assets.

## 15. Important Files

- `backend/app.py`: FastAPI app creation, env loading, CORS, router registration, startup vector warmup, health check.
- `backend/routes/upload.py`: upload/list/get/delete policy endpoints and orchestration of the document ingestion pipeline.
- `backend/routes/chatbot.py`: `/api/chat` request model and route handler.
- `backend/services/document_loader.py`: PDF/DOCX/DOC extraction and validation.
- `backend/services/chunker.py`: LangChain recursive text splitting.
- `backend/services/embeddings.py`: Gemini embedding calls.
- `backend/services/vector_store.py`: Chroma persistent client, collection, insert/search/delete, dimension mismatch handling.
- `backend/services/retriever.py`: query embedding and top-k retrieval.
- `backend/services/rag.py`: greeting/unrelated filters, prompt construction, Gemini answer generation.
- `backend/services/policy_registry.py`: JSON policy metadata registry.
- `backend/services/supabase_storage.py`: Supabase Storage upload/delete.
- `frontend/src/main.jsx`: React app bootstrapping.
- `frontend/src/App.jsx`: router layout and route registration.
- `frontend/src/services/api.js`: axios API functions.
- `frontend/src/services/localStorageService.js`: browser persistence for admin UI state and chat logs.
- `frontend/src/components/Chatbot.jsx`: chatbot UI and `/api/chat` integration.
- `frontend/src/components/UploadForm.jsx`: upload form and `/api/policies/upload` integration.
- `frontend/src/components/PolicyTable.jsx`: local policy table UI.
- `frontend/src/pages/AdminDashboard.jsx`: admin layout and dashboard overview.

## 16. Libraries Used

Frontend:

- React: component model and stateful UI.
- React DOM: browser rendering.
- React Router DOM: client-side routing.
- Vite: dev server and build tooling.
- Tailwind CSS with `@tailwindcss/vite`: utility CSS styling.
- axios: HTTP client for backend API calls.
- lucide-react: icon components.

Backend:

- FastAPI: API framework.
- Uvicorn: ASGI server, listed in requirements.
- python-multipart: multipart form/file upload support for FastAPI.
- python-dotenv: `.env` loading.
- supabase: Supabase client for Storage.
- chromadb: persistent vector database.
- google-genai: Gemini embedding and generation API.
- langchain: text splitter.
- langchain-community: `PyPDFLoader`.
- pypdf: underlying PDF parsing support.
- python-docx: DOCX paragraph extraction.

## 17. Error Handling

Invalid files:

- Frontend `UploadForm.handleFile()` rejects files that are not PDF/DOC/DOCX by MIME or extension.
- Backend `_prepare_upload()` rejects unsupported suffixes with HTTP 400.
- `document_loader._validate_file()` also validates file existence/type/suffix.

Empty or unreadable documents:

- `_ensure_text()` raises if extraction produces no text.
- Upload route catches general exceptions and returns HTTP 500 with the exception detail.

Duplicate uploads:

- No duplicate check exists.
- Same file can be uploaded repeatedly, producing separate policy IDs and vector records.

Authentication failures:

- Not applicable in current implementation because authentication is absent.

Missing documents:

- `GET /api/policies/{policy_id}` returns HTTP 404 if the registry has no matching policy.
- `DELETE /api/policies/{policy_id}` returns HTTP 404 for missing policy.
- Chat returns `NO_INDEXED_POLICIES_ANSWER` if `get_document_count() == 0` or no context is retrieved.

Gemini failures:

- Missing `GEMINI_API_KEY` raises `RuntimeError`.
- Chat route catches exceptions from `answer_question()` and returns HTTP 500.
- Upload route catches exceptions from embedding generation or other stages and returns HTTP 500.

Vector search failures:

- `vector_store.py` detects embedding dimension mismatch errors.
- If mismatch happens during upload/search, the collection is cleared and an `EmbeddingDimensionMismatchError` is raised.
- In `rag.answer_question()`, dimension mismatch during retrieval returns the generic fallback answer.

Supabase failures:

- Upload route tracks whether file upload succeeded.
- If later processing fails after Supabase upload, it attempts to delete the Supabase object.
- It also attempts to delete any Chroma records for the generated `policy_id`.

Temporary files:

- Upload route deletes the temporary local file in a `finally` block.

## 18. Security

Implemented security-related behavior:

- Environment variables are used for Gemini and Supabase credentials.
- CORS restricts allowed origins to configured/local/deployed frontend origins.
- Frontend and backend both validate file type by extension/MIME/suffix.
- Supabase service role key stays on the backend side.
- Uploaded filenames are reduced to a basename with `Path(...).name`, preventing path traversal in the generated temp/storage names.

Missing or weak security areas:

- No user authentication.
- No admin authorization.
- No protected frontend routes.
- No backend route protection.
- No rate limiting.
- No file size limit.
- No antivirus/malware scanning.
- No content-based file validation beyond extension/MIME and parser behavior.
- Error responses may expose raw exception details.
- Supabase service role key is used if present; this is powerful and should remain backend-only.

## 19. Complete Sequence Diagram

```text
User
  ↓ opens site
Frontend (React/Vite)
  ↓ renders App, Navbar, current route, Chatbot
User
  ↓ clicks Admin → Upload Policy
Frontend Admin UI
  ↓ validates metadata and PDF/DOC/DOCX
Frontend API client
  ↓ POST /api/policies/upload multipart/form-data
Backend FastAPI
  ↓ _prepare_upload()
Backend temp file
  ↓ original bytes
Supabase Storage
  ↑ upload_policy_file()
Backend
  ↓ load_document()
Document parser
  ↓ extracted text
Backend
  ↓ create_chunks()
LangChain splitter
  ↓ chunks
Backend
  ↓ generate_embeddings()
Gemini Embedding API
  ↓ embedding vectors
Backend
  ↓ add_documents()
Chroma Vector DB
  ↓ persisted indexed chunks
Backend
  ↓ add_policy()
Local policies.json
  ↓ success response
Frontend
  ↓ stores UI policy copy in localStorage

User
  ↓ asks question in Chatbot
Frontend Chatbot
  ↓ POST /api/chat { question }
Backend FastAPI
  ↓ get_static_response()
Backend RAG
  ↓ generate_embeddings(question)
Gemini Embedding API
  ↓ query embedding
Backend RAG
  ↓ search_documents(top_k=5)
Chroma Vector DB
  ↓ matching chunks + metadata + scores
Backend RAG
  ↓ _build_prompt(context, question)
Gemini 2.5 Flash
  ↓ generated answer
Backend FastAPI
  ↓ { answer, sources }
Frontend Chatbot
  ↓ renders answer text
Frontend localStorage
  ↓ saves chat log
```

## 20. Conclusion

Concise workflow summary:

1. Vite starts the React frontend, and `main.jsx` renders `App`.
2. `App.jsx` registers public and admin routes and mounts the chatbot globally.
3. FastAPI starts from `backend/app.py`, loads `.env`, configures CORS, and registers routers.
4. Backend startup touches Chroma through `get_document_count()` to warm the vector store.
5. Admin upload UI collects policy metadata and a PDF/DOC/DOCX file.
6. The frontend posts multipart form data to `/api/policies/upload`.
7. The backend validates the suffix, writes a temporary file, and uploads original bytes to Supabase Storage.
8. The backend extracts text using PDF, DOCX, or DOC-specific loaders.
9. Extracted text is split into overlapping chunks.
10. Gemini creates embeddings for those chunks.
11. Chroma stores chunk text, embeddings, generated IDs, and policy metadata.
12. The local JSON registry stores policy-level metadata and upload date.
13. A user question is posted from the chatbot to `/api/chat`.
14. The backend filters greetings/unrelated questions, embeds policy-related questions, retrieves top Chroma chunks, builds a prompt, and calls Gemini.
15. The frontend displays the answer and stores the query/response log in browser localStorage.

The core RAG upload and chat path is implemented, but authentication, admin protection, Supabase database tables, backend-driven policy table synchronization, and frontend source-citation rendering are not implemented in the current code.
