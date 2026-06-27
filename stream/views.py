from django.shortcuts import render
from django.http import HttpResponse, StreamingHttpResponse

from main.load import dynamo
import markdown

def stream(request):
    model = dynamo()
    model.Client()

    prompt = request.GET.get('prompt')

    response_generator = model.create(
        input=prompt,
        max_tokens=5000,
        temperature=0.6,
        top_k=40,
        top_p=0.85,
        repetition_penalty=1.15,
        stream=True
    )

    def stream_html_response():
        yield "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Document</title></head><body>"
        
        buffer = ""
        for chunk in response_generator:
            buffer += chunk
            yield f"<span>{chunk}</span>"
        yield "<br><br><br><br>"
        yield "<h2>Response: </h2><br>"
        yield f"<p>{markdown.markdown(buffer)}</p>"

        yield "</body></html>"

    return StreamingHttpResponse(stream_html_response(), content_type='text/html')