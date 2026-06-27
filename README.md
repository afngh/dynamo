---
title: Dynamo Backend
emoji: 👾
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# dynamo 👾

> A 33M parameter decoder-only transformer built entirely from scratch in PyTorch — served through a Django streaming API and an interactive React frontend.

No pretrained weights. No Hugging Face `pipeline()`. Just raw attention math, a modular codebase, an incremental daily pretraining workflow, and a modern web interface.

---

## Architecture

| Component | Implementation |
|---|---|
| Tokenizer | GPT-2 BPE via `tiktoken` — fixed vocab of 50,257 tokens |
| Embedding | `nn.Embedding(vocab_size, dim)` with weight tying to output head |
| Positional Encoding | Sinusoidal, sized to `max_seq_len=256` |
| Attention | Causal multi-head self-attention with upper-triangular mask |
| Normalization | `RMSNorm` (pre-norm — applied before each sublayer) |
| FFN | SwiGLU — `w_down(silu(w_gate(x)) * w_value(x))`, no bias |
| Depth | 6 stacked `TransformerBlock` layers via `nn.ModuleList` |
| Output | `nn.Linear(dim, vocab_size)` — weight-tied to embedding table |
| Optimizer | AdamW — `lr=1e-3`, `weight_decay=0.1`, `betas=(0.9, 0.95)` |
| Grad Clipping | `clip_grad_norm_` at `1.0` |
| Scheduler | `CosineAnnealingLR(T_max=100, eta_min=1e-5)` |

**Config:** `dim=256`, `heads=4`, `layers=6`, `dropout=0.1`, `seq_len=256`, `vocab_size=50257` — ~17M parameters

For an in-depth deep dive into the system mechanics and execution flow, see [`SETUP.md`](SETUP.md).

---

## Project Structure

```
dynamo/
├── main/                                 # Core PyTorch Transformer Engine
│   ├── train.py                          # Daily training entry point
│   ├── load.py                           # Inference entry point
│   ├── transformer_orch/                 # Attention, RMSNorm, SwiGLU & Orchestrator modules
│   ├── seq2seq/                          # TokenCodec wrapping tiktoken GPT-2
│   ├── config/                           # All hyperparameter config classes
│   ├── fine_tune/                        # Checkpoint loading, training & HF sync
│   └── generator_config/                 # Top-p nucleus sampling & PretrainedHandler
├── api/                                  # Django REST API settings & configuration
├── stream/                               # Streaming SSE response handlers & Supabase logging
├── frontend/                             # React 19 + Vite frontend application
│   ├── src/                              # Chat UI, Settings Drawer, streaming hooks
│   └── package.json                      # Frontend npm dependencies
├── setup/                                # Environment setup scripts
│   ├── setup.sh                          # Orchestrator script for full-stack setup
│   ├── setup_backend.sh                  # Python deps, directories & Django migrations
│   └── setup_frontend.sh                 # Node/NPM checks & package installation
├── bin/                                  # Checkpoint & configuration storage (gitignored)
├── SETUP.md                              # Detailed architecture & setup guide
├── AGENTS.md                             # AI Agent operating guidelines & scope policies
├── CONTRIBUTING.md                       # Human contribution guidelines & AI policy
├── manage.py                             # Django management script
├── requirements.txt                      # Python backend dependencies
└── .env.example                          # Root environment variables template
```

---

## Quick Start

```bash
git clone https://github.com/afngh/dynamo.git
cd dynamo

# 1. Run full automated setup (installs deps, sets up .env, runs migrations)
bash setup/setup.sh

# 2. Start the Django backend API (terminal 1)
python manage.py runserver

# 3. Start the React frontend UI (terminal 2)
cd frontend && npm run dev
```

For modular setup instructions (backend-only or frontend-only) and environment variable details, refer to [`SETUP.md`](SETUP.md).

---

## Daily Pretraining Workflow

The model trains on one dataset per day, saves a checkpoint to Hugging Face Hub, and resumes from it the next day on a new file. GPT-2's fixed vocabulary makes checkpoints compatible across any dataset switch.

```
Day 1 — no checkpoint exists:
  python -m main.train   →  initializes fresh model, trains, pushes to HF

Day N — checkpoint exists on HF:
  python -m main.train   →  pulls checkpoint, continues training, pushes update
```

To switch datasets, change one line in `main/train.py`:

```python
FILE_PATH = 'data/your_dataset.txt'
```

Checkpoints live on Hugging Face Hub (model files are ~400MB — too large for Git). Every push creates a new commit, so any previous session is recoverable by commit hash.

---

## Inference & Streaming API

### CLI Inference
```python
from main.generator_config._load_config_and_model import PretrainedHandler

handler = PretrainedHandler('bin/model/model.pt', 'bin/data/config.pkl')
model, config = handler.load()
client = handler.client(model, config, require_params=True, temperature=0.8, max_tokens=100)

print(client.generate_response("to be or not to be"))
```

### Server-Sent Events (SSE) Streaming
The Django backend streams tokens in real-time over HTTP GET requests at `/dynamo/`:

```python
# Returns text/event-stream payloads consumed by the React frontend
payload = json.dumps({"token": chunk})
yield f"data: {payload}\n\n"
```

---

## 🤖 AI Agent & Contribution Policies

This repository serves as a hands-on learning environment for deep learning mechanics. Strict guidelines govern the use of AI tools:

- 🟢 **Frontend Allowed**: AI assistants and coding agents are fully permitted to build, refactor, and style UI components under `frontend/`.
- 🔴 **Backend & Model Prohibited**: AI tools are strictly forbidden for core PyTorch module code, attention mechanisms, and model configurations under `main/`, `api/`, and `stream/`.

For complete operational boundaries, read [`AGENTS.md`](AGENTS.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Requirements

```
torch
tiktoken
rich
huggingface_hub
python-dotenv
django
django-cors-headers
markdown
supabase
```

---

## License

MIT — see [`LICENSE`](LICENSE).