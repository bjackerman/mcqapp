# Question Record Schema

Every record in `src/lib/data/questions.json` and every future imported question set must satisfy the machine-readable schema in `src/lib/data/question.schema.json`.

## Required fields

| Field | Type | Rules | Notes |
| --- | --- | --- | --- |
| `id` | string or integer | Required, unique across the dataset, non-empty if string. | Prefer namespaced strings for production imports, for example `networking-001`; numeric IDs remain supported for the existing seed dataset. |
| `question` | string | Required, non-empty. | The prompt shown to the learner. |
| `options` | string array | Required, exactly 4 non-empty strings. | Rendered as A/B/C/D in array order. |
| `correct` | integer | Required, 0 through 3. | Zero-based index into `options`: `0` is A, `1` is B, `2` is C, `3` is D. |
| `explanation` | string | Required, non-empty. | Displayed after a learner submits an answer. |
| `tags` | string array | Required, at least 1 unique non-empty string. | Must map to a canonical topic in `src/lib/data/taxonomy.js`; legacy aliases are allowed only when explicitly mapped there. |

No extra top-level fields are allowed by the JSON Schema. Additive metadata should be discussed first and then added to `question.schema.json`, the validator, and this document in the same PR.

## Example

```json
{
  "id": "networking-001",
  "question": "Which HTTP status code indicates a successful GET request?",
  "options": ["200 OK", "404 Not Found", "500 Internal Server Error", "301 Moved Permanently"],
  "correct": 0,
  "explanation": "HTTP 200 OK means the request succeeded and the response contains the requested data.",
  "tags": ["Network Infrastructure"]
}
```

## Validation behavior

`npm run validate` checks the JSON schema shape plus app-specific constraints that are not fully represented in the static schema:

- Duplicate `id` values fail validation.
- Every tag must resolve to a canonical topic or mapped legacy alias in `src/lib/data/taxonomy.js`.
- Validation reports how many canonical topics currently have bundled seed questions.
