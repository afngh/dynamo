import os
import json
from django.shortcuts import render
from django.http import HttpResponse, StreamingHttpResponse
from main.load import dynamo

try:
    from supabase import create_client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    supabase_client = None
    if supabase_url and supabase_key and "placeholder" not in supabase_url:
        supabase_client = create_client(supabase_url, supabase_key)
except Exception as e:
    supabase_client = None

def _dynamo(prompt: str, user_email: str = None):
    model = dynamo()
    model.Client()

    response_generator = model.create(
        input=prompt,
        max_tokens=2000,
        temperature=0.6,
        top_k=40,
        top_p=0.85,
        repetition_penalty=1.15,
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
                print("Supabase logging notice:", log_err)

def stream(request):
    prompt = request.GET.get('prompt')
    user_email = request.GET.get('user_email')

    response = StreamingHttpResponse(
        _dynamo(prompt, user_email=user_email),
        content_type="text/event-stream"
    )

    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"

    return response