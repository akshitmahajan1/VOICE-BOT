const key = "AIzaSyCpt__ktU2AtE5-3cgt0L0AgiC8GONt7wA";
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "hi" }] }]
    })
}).then(async r => {
    console.log(r.status);
    console.log(await r.text());
}).catch(console.error);
