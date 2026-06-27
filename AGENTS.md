# AGENTS.md — AI Agent Guidelines & Policy

This repository implements a 33M parameter decoder-only Transformer built from scratch in PyTorch, served via a Django streaming API and a React frontend.

Because this project serves as a hands-on learning environment for understanding transformer mathematics and deep learning mechanics from first principles, strict boundaries are enforced regarding AI assistance.

---

## 🚦 Operational Scopes

### 🟢 Allowed Scope (Frontend & UI Only)
AI Agents (including Antigravity, Cursor, Copilot, ChatGPT, Claude) are **fully permitted** to modify, refactor, and create code in the following areas:
- `frontend/`: All React components (`src/components/`), pages (`src/App.jsx`), styling (`src/index.css`), Vite configs, and client-side logic.
- Documentation (`*.md` files): Explanations, setup guides, and project documentation.
- Helper scripts: Setup automation in `setup/` when explicitly requested by maintainers.

### 🔴 Prohibited Scope (Backend & Model Engine)
AI Agents are **strictly forbidden** from generating or modifying code in the following areas:
- `main/`: All core PyTorch transformer modules, attention mechanisms (`_attention.py`), SwiGLU activations (`_swiglu_activation.py`), model orchestrator (`_model_orc.py`), positional embeddings, and model configuration classes (`_model_config.py`).
- `main/train.py` & `main/load.py`: Pretraining workflows, Hugging Face checkpoint syncing, and inference handling.
- `api/` & `stream/`: Django REST framework settings, streaming HTTP response generators, and backend architecture.

---

## 📐 Guidelines for AI Agents Working on Frontend

When generating code within the allowed `frontend/` scope, agents must adhere to the following rules:

1. **Tech Stack Integrity**:
   - Framework: React 19 + Vite.
   - Styling: Vanilla CSS with custom CSS variables (found in `src/index.css`). Avoid introducing utility CSS frameworks (like Tailwind) unless explicitly requested.
   - Backend Communication: Standard Server-Sent Events (SSE) / EventSource streaming endpoint connecting to Django backend.

2. **Aesthetics & Design**:
   - Maintain modern, dark-themed, sleek glassmorphism aesthetic consistent with existing UI.
   - Use dynamic visual feedback (streaming token animations, smooth transitions, glass cards).

3. **Validation**:
   - Ensure `npm run lint` (`oxlint`) passes cleanly without introducing new syntax or lint warnings.
   - Do not touch or modify backend API parameters without human coordination.

---

## 🔗 Related Resources
- [CONTRIBUTING.md](file:///home/shaikafnan/dynamo/dynamo/CONTRIBUTING.md) — Human contribution guidelines and philosophy.
- [setup.md](file:///home/shaikafnan/dynamo/dynamo/setup.md) — Comprehensive architecture breakdown and developer setup guide.
