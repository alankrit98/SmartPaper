# AI Question Paper Generator

An AI-powered backend that generates structured university exam question papers based on subject, difficulty, and section pattern configuration. Papers are stored in MongoDB and exported as A4 PDFs.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| AI Service | Python, FastAPI, HuggingFace Transformers, FAISS, SentenceTransformers |
| PDF Generation | Puppeteer (HTML → PDF) |
| Authentication | JWT, bcrypt |

## Architecture

```
Frontend → Node.js Backend → Python AI Service (RAG + LLM)
                ↓                      ↓
           MongoDB (store paper)   FAISS Vector DB
                ↓                  (syllabus + past questions)
           Puppeteer (generate PDF)
                ↓
           Return paper + PDF to frontend
```

The AI service uses **Retrieval-Augmented Generation (RAG)**:
1. Embeds the query using SentenceTransformers
2. Retrieves relevant syllabus topics and past questions from FAISS
3. Injects the retrieved context into the LLM prompt
4. Generates structured questions grounded in real course material

## Folder Structure

```
server/
├── server.js                    # Entry point
├── .env.example                 # Environment variables template
├── package.json
├── pdfs/                        # Generated PDF files
└── src/
    ├── config/
    │   └── db.js                # MongoDB connection
    ├── controllers/
    │   ├── authController.js    # Register & login
    │   └── paperController.js   # Generate, list, get, download
    ├── middleware/
    │   └── authMiddleware.js    # JWT verification
    ├── models/
    │   ├── User.js              # User schema
    │   └── QuestionPaper.js     # Paper schema with sections
    ├── routes/
    │   ├── authRoutes.js        # POST /register, /login
    │   └── paperRoutes.js       # POST /generate, GET /, /:id, /:id/pdf
    ├── services/
    │   ├── aiService.js         # Calls Python AI service
    │   └── pdfService.js        # Puppeteer HTML→PDF
    └── utils/
        ├── logger.js            # Structured console logger
        └── validatePattern.js   # Section pattern validation

ai-service/
├── app.py                       # FastAPI entry point (port 8000)
├── requirements.txt
├── data/
│   └── knowledge_base.txt       # Seed data (syllabus + questions)
├── storage/
│   ├── faiss_index              # Persisted FAISS vector index
│   └── metadata.json            # Aligned metadata for each vector
├── rag/
│   ├── embedder.py              # SentenceTransformer wrapper
│   ├── vector_store.py          # FAISS index + metadata manager
│   ├── retriever.py             # Semantic search over vector store
│   └── index_builder.py         # Bootstrap index from knowledge_base.txt
├── generator/
│   └── question_generator.py    # RAG-augmented LLM question generation
└── ingestion/
    ├── syllabus_ingestor.py     # POST /add-syllabus pipeline
    └── paper_ingestor.py        # POST /add-paper pipeline
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |

### Question Papers (requires JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/papers/generate` | Generate a new question paper |
| GET | `/api/papers` | List all papers by logged-in user |
| GET | `/api/papers/:id` | Get full paper with questions |
| GET | `/api/papers/:id/pdf` | Download paper as PDF |

### AI Service — Knowledge Ingestion & Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/add-syllabus` | Add syllabus topics to the vector store |
| POST | `/add-paper` | Add past exam questions to the vector store |
| GET | `/search` | Semantic search over the knowledge base |
| GET | `/health` | Health check with model & vector count info |

### Generate Paper — Request Body

```json
{
  "subject": "Data Structures",
  "course": "B.Tech",
  "branch": "Computer Science",
  "year": 3,
  "difficulty": "medium",
  "totalMarks": 60,
  "pattern": [
    { "section": "A", "questions": 10, "marksEach": 2 },
    { "section": "B", "questions": 5,  "marksEach": 6 },
    { "section": "C", "questions": 2,  "marksEach": 10 }
  ]
}
```

The backend validates that `(10×2) + (5×6) + (2×10) = 60 = totalMarks` before calling the AI.

## Setup & Run

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB running locally (or a connection string)
- Google Chrome / Chromium (for Puppeteer)

### 1. Clone & configure

```bash
cd AI_QuestionPaper/server
cp .env.example .env
# Edit .env with your MongoDB URI and a strong JWT_SECRET
```

### 2. Install & start the Node.js backend

```bash
cd server
npm install
npm run dev
```

Server starts on **http://localhost:3000**.

### 3. Install & start the Python AI service

```bash
cd ai-service
pip install -r requirements.txt
python app.py
```

AI service starts on **http://localhost:8000**.
On first launch, the seed knowledge base (`data/knowledge_base.txt`) is automatically indexed into FAISS.

### 4. Add knowledge to the vector store (optional)

```bash
# Add syllabus topics
curl -X POST http://localhost:8000/add-syllabus \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Data Structures",
    "topics": [
      "Red-Black Trees",
      "Skip Lists",
      "Trie data structure"
    ]
  }'

# Add past exam questions
curl -X POST http://localhost:8000/add-paper \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Data Structures",
    "questions": [
      "Compare Red-Black trees with AVL trees.",
      "Explain trie operations with time complexity."
    ]
  }'

# Test semantic search
curl "http://localhost:8000/search?query=tree+rotations&top_k=5&subject=Data+Structures"
```

### 5. Test the full flow

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"password123","role":"admin"}'

# Login (copy the token from response)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Generate a paper (replace <TOKEN>)
curl -X POST http://localhost:3000/api/papers/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "subject":"Data Structures",
    "course":"B.Tech",
    "branch":"CSE",
    "year":2,
    "difficulty":"medium",
    "totalMarks":60,
    "pattern":[
      {"section":"A","questions":10,"marksEach":2},
      {"section":"B","questions":5,"marksEach":6},
      {"section":"C","questions":2,"marksEach":10}
    ]
  }'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `MONGO_URI` | `mongodb://localhost:27017/ai_question_paper` | MongoDB connection string |
| `JWT_SECRET` | — | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | 7d | Token expiry duration |
| `AI_SERVICE_URL` | `http://localhost:8000` | Python AI service URL |
| `PDF_STORAGE_PATH` | `./pdfs` | Directory for generated PDFs |
| `COLLEGE_NAME` | University College of Engineering | Name shown on PDF header |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | SentenceTransformer model for embeddings |
| `LLM_MODEL` | `google/flan-t5-base` | HuggingFace model for question generation |

## RAG Pipeline

The AI service implements a full RAG pipeline:

1. **Embedding** — `rag/embedder.py` uses `all-MiniLM-L6-v2` (384-dim vectors)
2. **Vector Store** — `rag/vector_store.py` manages a FAISS `IndexFlatL2` index persisted to disk alongside aligned JSON metadata
3. **Retrieval** — `rag/retriever.py` embeds queries, searches FAISS, and optionally filters by subject
4. **Generation** — `generator/question_generator.py` builds prompts with retrieved context and calls the LLM to generate exam questions
5. **Ingestion** — `ingestion/` modules enable adding new syllabus topics and past papers at runtime without rebuilding the index

## License

ISC