# Contract Review App

A simple web app for reviewing a contract. Upload a PDF, read it on the left, and ask questions about it in the chat on the right. Built with plain HTML, CSS and JavaScript: no frameworks, no build tools.

## Key features

- **PDF upload:** click to browse or drag and drop a PDF onto the contract panel.
- **Contract preview:** the PDF is shown next to the chat, so you can read it while you ask questions.
- **Two independent panels:** the contract and the chat scroll separately.
- **Chat with the contract:** your question and the uploaded PDF are sent to a webhook, and the answer appears in the chat.
- **Citations and reasoning:** each answer can show the supporting contract text and a short explanation.
- **Clean, responsive layout:** a navy and orange design that stacks on narrow screens.

## Run it locally

1. Download or clone this repository.
2. Open `index.html` in your web browser (double-click it).

That's it. There is nothing to install.

## Connecting the chat

The chat sends a `POST` request (multipart form data with a `file` and a `message`) to the webhook set at the top of `app.js`:

```js
const WEBHOOK_URL = '...';
```

Change that URL to point at your own webhook. It should reply with JSON in this shape:

```json
{
  "response": "The answer to the question",
  "citation": ["Exact contract text that supports the answer"],
  "reasoning": "One or two sentences on how the citations support the answer"
}
```

A plain-text reply also works and is shown as the answer.

Notes:

- The webhook must allow requests from the browser (CORS).
- The contract you upload is sent to the webhook, so only use a service you trust.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `styles.css` | Styling |
| `app.js` | Upload, PDF preview and chat logic |
