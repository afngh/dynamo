from django.shortcuts import render
from django.http import HttpResponse, StreamingHttpResponse

from main.load import dynamo
import markdown
import json

async def _dynamo(prompt :str):
    model = dynamo()
    model.Client()

    response_generator = model.create(
        input=prompt,
        max_tokens=200,
        temperature=0.6,
        top_k=40,
        top_p=0.85,
        repetition_penalty=1.15,
        stream=True
    )

    try:
        for chunk in response_generator:
            payload = json.dumps({"token": chunk})
            yield f"data: {payload}\n\n"

    except Exception as e:
        error_payload = json.dumps({"error": str(e)})
        yield f"data: {error_payload}\n\n"

    finally:
        yield "data: [DONE]\n\n"

def stream(request):
    prompt = request.GET.get('prompt')

    response = StreamingHttpResponse(
        _dynamo(prompt),
        content_type="text/event-stream"
    )

    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"

    return response