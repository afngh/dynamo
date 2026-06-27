from django.urls import path
from . import views

urlpatterns = [
    path('', views.stream, name="dynamo_stream_response")
]