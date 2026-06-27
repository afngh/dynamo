# Contributing

Thanks for your interest in contributing. Before you do anything, read this.

---

## This is a learning project. That changes everything.

This repository exists for one reason — to understand how transformers work by building every part by hand. That goal shapes every rule below.

**AI Code Policy: Frontend Only**

AI assistants, autocomplete tools, and autonomous agents (e.g., Antigravity, GitHub Copilot, Cursor, ChatGPT, Claude) are **permitted strictly for frontend development** (`frontend/` directory).

However, **AI-generated code is strictly prohibited for backend and model code** (`main/`, `api/`, `stream/`, model configs, and transformer blocks).

This repository exists to learn and build transformer models from scratch. Model architecture and backend code must be written, debugged, and understood by human contributors hands-on. For detailed agent guidelines and operational boundaries, see [AGENTS.md](file:///home/shaikafnan/dynamo/dynamo/AGENTS.md).

---

## What you can contribute

- Frontend UI/UX enhancements, React components, and styling (AI tools permitted here)
- Bug fixes in backend or frontend — genuine bugs with explanation
- Architecture improvements — written and understood by hand
- New training datasets or data cleaning scripts
- Documentation improvements — clearer explanations, README corrections

---

## What you cannot contribute

- Backend, API, or model code written or completed by any AI assistant or agent
- Wrapper classes around Hugging Face Transformers, PyTorch Lightning, or similar libraries for core model logic
- Anything in the model architecture you cannot explain line by line
- Pretrained weights or checkpoints from other models

---

## How to contribute

1. Fork the repo
2. Create a branch — `fix/your-bug-name` or `feature/your-feature-name`
3. Write your code yourself, by hand
4. Test it — make sure training runs and loss goes down
5. Open a PR with a clear description of what changed and why

PR descriptions should answer three things:
- What is the problem or improvement?
- What did you change?
- Did you verify it works?

---

## Code style

- One class or concept per file — match the existing structure under `main/transformer_orch/`
- Config classes go in `main/config/_model_config.py`
- No magic numbers — if it's a hyperparameter, it belongs in a config class
- Comments should explain *why*, not *what* — the code already shows what

---

## Questions

Open an issue. If something in the architecture is unclear or you think something is wrong, say so — that kind of discussion is exactly what this project is for.

---

> *This project was built hands + keyboard. Contributions should be too.*