# Setup & Architecture Guide 👾

Welcome to **Dynamo**! This document explains the inner workings of the project, how every subsystem operates under the hood, and how to get your development environment up and running smoothly.

---

## 🏗️ Project Architecture: How Everything Works

Dynamo is an end-to-end custom Large Language Model system consisting of three primary layers:
1. **Core PyTorch Transformer Engine** (`main/`)
2. **Django Streaming REST API** (`api/` & `stream/`)
3. **React + Vite Frontend** (`frontend/`)

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite UI                      │
│      (Chat Interface, Settings Panel, Streaming)       │
└───────────────────────────┬────────────────────────────┘
                            │ SSE (text/event-stream)
┌───────────────────────────▼────────────────────────────┐
│                    Django Web Server                   │
│         (stream/views.py Event Generator)              │
└───────────────────────────┬────────────────────────────┘
                            │ PyTorch Generator API
┌───────────────────────────▼────────────────────────────┐
│                Dynamo Transformer Model                │
│ (RMSNorm -> Causal Multi-Head Attn -> SwiGLU FFN)      │
└────────────────────────────────────────────────────────┘
```

---

### 1. Core Transformer Architecture (`main/`)

Built entirely from PyTorch primitives without using pretrained high-level abstractions, Dynamo implements a modern decoder-only transformer architecture:

* **Tokenizer (`main/seq2seq/_gpt2_tokenizer.py`)**: Uses GPT-2 Byte-Pair Encoding (BPE) via `tiktoken` with a fixed vocabulary size of 50,257 tokens. This ensures model checkpoints remain structurally compatible across different pretraining datasets.
* **Embeddings & Weight Tying (`main/transformer_orch/_embedding.py` & `_transformer.py`)**: Token IDs are projected into a `dim=256` hidden space. The final output projection layer shares weight matrices with the token embedding table, saving millions of parameters and constraining token representation spaces.
* **Sinusoidal Positional Encoding (`main/transformer_orch/_positional_embedding.py`)**: Adds position awareness up to `max_seq_len=256` using fixed sine and cosine frequencies.
* **Causal Self-Attention (`main/transformer_orch/_attention.py`)**: Implements multi-head self-attention with an upper-triangular mask (`tril`) to prevent tokens from attending to future positions during autoregressive generation.
* **RMSNorm (`main/transformer_orch/_post_attention.py`)**: Applied in a pre-norm configuration before each attention and feed-forward block for gradient stability during pretraining.
* **SwiGLU Feed-Forward Network (`main/transformer_orch/_swiglu_activation.py`)**: Replaces standard GELU/ReLU FFNs with Swish-Gated Linear Units:
  $$\text{SwiGLU}(x) = W_{\text{down}}(\text{SiLU}(W_{\text{gate}} x) \otimes W_{\text{value}} x)$$
* **Top-P / Top-K Nucleus Sampling (`main/generator_config/_generator_api.py`)**: Generates text by dynamic probability truncation, temperature scaling, and repetition penalty tracking.

---

### 2. Django Streaming API Backend (`api/` & `stream/`)

The backend wraps the PyTorch model into an asynchronous server capable of real-time streaming:

* **Endpoint (`/dynamo/`)**: Listens for HTTP GET requests containing `prompt`, `max_tokens`, `temperature`, `top_p`, `top_k`, and `repetition_penalty`.
* **Server-Sent Events (SSE)**: Uses Django's `StreamingHttpResponse` with `content_type="text/event-stream"`. It yields generated tokens chunk by chunk formatted as JSON payloads: `data: {"token": "..."}\n\n`.
* **Database Auditing (`stream/views.py`)**: Automatically records completed prompts and model responses asynchronously into Supabase (`chat_logs` table) if credentials are configured in `.env`.

---

### 3. React Frontend (`frontend/`)

A sleek, dark-themed user interface built with React 19 and Vite:

* **Real-Time Token Rendering**: Consumes SSE streams using standard `fetch` readers, appending tokens in real time with smooth scrolling and dynamic Markdown parsing (`react-markdown`).
* **Interactive Controls**: A drawer component (`SettingsPanel.jsx`) allowing users to adjust sampling parameters (`temperature`, `top_p`, `max_tokens`, etc.) on the fly.
* **Supabase Authentication**: Integrated client-side auth for managing sessions and saving user chat histories.

---

## 🚀 Step-by-Step Setup for New Developers

Setting up Dynamo is automated through dedicated scripts in the `setup/` folder.

### Prerequisites

Ensure you have the following installed on your machine:
- **Python 3.10+** (with `pip`)
- **Node.js 18+** (with `npm`)
- **Git**

---

### 1. Clone the Repository

```bash
git clone https://github.com/afngh/dynamo.git
cd dynamo
```

---

### 2. Run Automated Setup

You can set up both backend and frontend environments in one command using the master setup script:

```bash
bash setup/setup.sh
```

Alternatively, you can run setup individually for each tier:

#### Backend Setup Only
```bash
bash setup/setup_backend.sh
```
*This script verifies Python, creates required folders (`bin/model/`, `bin/data/`), sets up `.env` from `.env.example`, installs Python packages from `requirements.txt`, and executes Django database migrations.*

#### Frontend Setup Only
```bash
bash setup/setup_frontend.sh
```
*This script verifies Node/NPM, sets up `frontend/.env` from `.env.example`, and installs frontend packages via `npm install`.*

---

### 3. Environment Variables Configuration

Verify or update your local environment files:

* **Root Backend (`.env`)**:
  ```ini
  MODEL_PATH=bin/model/model.pt
  CONFIG_PATH=bin/data/config.pkl
  HF_REPO_ID=afnhf/dynamo
  SUPABASE_URL=https://your-supabase-project.supabase.co
  SUPABASE_KEY=your-supabase-key
  ```

* **Frontend (`frontend/.env`)**:
  ```ini
  VITE_ENDPOINT_URL=http://127.0.0.1:8000/dynamo/
  VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```

---

### 4. Running the Development Servers

Open two terminal windows/tabs:

#### Terminal 1 — Start Backend Server
```bash
python manage.py runserver
```
*The API will start running at `http://127.0.0.1:8000/`.*

#### Terminal 2 — Start Frontend Server
```bash
cd frontend
npm run dev
```
*The UI will start running (typically at `http://localhost:5173/`).*

---

## 🧠 Training & Inference Commands

* **Run Incremental Daily Training**:
  ```bash
  python -m main.train
  ```
* **Test Local Inference in CLI**:
  ```bash
  python -m main.load
  ```
