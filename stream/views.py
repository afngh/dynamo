import os
import json
from django.http import StreamingHttpResponse
from main.load import dynamo

try:
    from supabase import create_client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    supabase_client = None
    if supabase_url and supabase_key and "placeholder" not in supabase_url:
        supabase_client = create_client(supabase_url, supabase_key)
except Exception:
    supabase_client = None

def _dynamo(prompt: str, user_email: str = None, max_tokens: int = 500, temperature: float = 0.7, top_p: float = 0.85, top_k: int = 40, repetition_penalty: float = 1.15):
    model = dynamo()
    model.Client()

    response_generator = model.create(
        input=prompt,
        max_tokens=max_tokens,
        temperature=temperature,
        top_k=top_k,
        top_p=top_p,
        repetition_penalty=repetition_penalty,
        stream=True
    )

    full_response = ""

    try:
        for chunk in response_generator:
            full_response += chunk
            payload = json.dumps({"token": chunk})
            yield f"data: {payload}\n\n"
    except Exception as e:
        error_payload = json.dumps({"error": str(e)})
        yield f"data: {error_payload}\n\n"
    finally:
        yield "data: [DONE]\n\n"
        if supabase_client and prompt:
            try:
                supabase_client.table("chat_logs").insert({
                    "prompt": prompt,
                    "response": full_response,
                    "user_email": user_email
                }).execute()
            except Exception as log_err:
                print("Logging error:", log_err)

def stream(request):
    prompt = request.GET.get('prompt', '')
    user_email = request.GET.get('user_email')
    
    try:
        max_tokens = int(request.GET.get('max_tokens', 500))
    except (ValueError, TypeError):
        max_tokens = 500

    try:
        temperature = float(request.GET.get('temperature', 0.7))
    except (ValueError, TypeError):
        temperature = 0.7

    try:
        top_p = float(request.GET.get('top_p', 0.85))
    except (ValueError, TypeError):
        top_p = 0.85

    try:
        top_k = int(request.GET.get('top_k', 40))
    except (ValueError, TypeError):
        top_k = 40

    try:
        repetition_penalty = float(request.GET.get('repetition_penalty', 1.15))
    except (ValueError, TypeError):
        repetition_penalty = 1.15

    response = StreamingHttpResponse(
        _dynamo(
            prompt,
            user_email=user_email,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            repetition_penalty=repetition_penalty
        ),
        content_type="text/event-stream"
    )

    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"

    return response