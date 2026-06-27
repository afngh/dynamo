# dynamo 👾

> A 33M parameter decoder-only transformer built entirely from scratch in PyTorch — served through a Django streaming API.

No pretrained weights. No Hugging Face `pipeline()`. Just raw attention math, a modular codebase, and an incremental daily pretraining workflow that accumulates knowledge across datasets over time.

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

---

## Project Structure

```
dynamo/
├── main/
│   ├── train.py                          # Daily training entry point
│   ├── load.py                           # Inference entry point
│   ├── transformer_orch/
│   │   ├── _attention.py                 # Causal multi-head self-attention
│   │   ├── _embedding.py                 # Token embedding table
│   │   ├── _positional_embedding.py      # Sinusoidal positional encoding
│   │   ├── _post_attention.py            # Pre-norm block (RMSNorm + Attn + SwiGLU)
│   │   ├── _swiglu_activation.py         # SwiGLU FFN
│   │   ├── _transformer.py               # Output projection head
│   │   ├── _transformer_block.py         # Single transformer block wrapper
│   │   └── _model_orc.py                 # Model orchestrator + weight tying
│   ├── seq2seq/
│   │   └── _gpt2_tokenizer.py            # TokenCodec wrapping tiktoken GPT-2
│   ├── config/
│   │   └── _model_config.py              # All hyperparameter config classes
│   ├── fine_tune/
│   │   └── _fine_tune_model.py           # FineTuneModel — load, train, save, HF sync
│   └── generator_config/
│       ├── _generator_api.py             # Generator — top-p sampling + EOS stopping
│       └── _load_config_and_model.py     # PretrainedHandler — load for inference
│
├── api/                                  # Django REST API
├── stream/                               # Streaming response handlers
├── setup/
│   └── setup.sh                          # One-time environment setup
├── bin/
│   ├── model/                            # Local checkpoint cache (gitignored)
│   └── data/                             # config.pkl
├── manage.py
├── requirements.txt
└── .env.example
```

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

## Quick Start

```bash
git clone https://github.com/afngh/dynamo.git
cd dynamo

cp .env.example .env          # fill in your HF token
bash setup/setup.sh           # install deps + HF login

python -m main.train          # start or resume training
python -m main.load           # run inference
python manage.py runserver    # start the Django API
```

---

## Inference

```python
from main.generator_config._load_config_and_model import PretrainedHandler

handler = PretrainedHandler('bin/model/model.pt', 'bin/data/config.pkl')
model, config = handler.load()
client = handler.client(model, config, require_params=True, temperature=0.8, max_tokens=100)

print(client.generate_response("to be or not to be"))
```

Generation uses top-p nucleus sampling with temperature scaling. Stops at `<|endoftext|>` (token id `50256`) or `max_tokens`, whichever comes first.

---

## Streaming API

The Django backend exposes the model through a streaming endpoint, yielding tokens as they're generated and compiling markdown on the fly:

```python
def stream_html_response():
    yield "<!DOCTYPE html>..."
    buffer = ""
    for chunk in response_generator:
        buffer += chunk
        if "\n" in buffer:
            lines = buffer.split("\n")
            for line in lines[:-1]:
                yield f"<span>{markdown.markdown(line)}</span>"
            buffer = lines[-1]
    if buffer:
        yield f"<span>{markdown.markdown(buffer)}</span>"
    yield "</body></html>"

return StreamingHttpResponse(stream_html_response(), content_type='text/html')
```

---

## Design Decisions

**Weight tying** — the output projection shares weights with the token embedding table. Saves ~13M parameters and enforces a single consistent token representation space.

**Pre-norm** — RMSNorm is applied before each sublayer, not after. Produces more stable gradients throughout training, especially during the first few hundred steps of each daily session when optimizer momentum is cold.

**Full-sequence loss** — targets are inputs shifted by one position, so every token in a sequence contributes a gradient signal simultaneously (~256x more signal per batch vs. next-token-only prediction).

**Fixed tokenizer** — GPT-2 BPE over a custom word-level vocab means checkpoints never become structurally incompatible when switching datasets.

---

## Requirements

```
torch
tiktoken
rich
huggingface_hub
dotenv
django
```

---

## License

MIT — see [`LICENSE`](LICENSE).