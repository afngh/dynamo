async function stream() {
    const response = await fetch(`http://127.0.0.1:8000/dynamo/?prompt=tell+me+a+joke`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n\n").filter(line => line.startsWith("data: "));

        for (const line of lines) {
            const data = line.replace("data: ", "").trim();
            if (data === "[DONE]") return;
            const { token } = JSON.parse(data);
            console.log(token);
        }
    }
}

stream();