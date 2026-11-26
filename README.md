# Requests & Approval prototype

Two projects:

| Folder | What it is |
| --- | --- |
| [`projects/request-&-approvals-prototype`](projects/request-%26-approvals-prototype) | Angular prototype of a Requests & Approval area, with no login and mock data served in the browser |
| [`projects/r&a-handoff-doc`](projects/r%26a-handoff-doc) | Static handoff docs of that prototype (Home, Gap review, Impact, Versions) |

Each folder has its own README. The prototype's `AGENTS.md` and `docs/` explain the structure, the mocks and how to iterate.

## Notes

- Everything that identified a real environment (API keys, internal hosts, tokens, application ids) was replaced with placeholders. The app answers every API call from mock data in the browser, so none of them is needed to run it.
- Installing the dependencies needs access to a private npm registry and to FontAwesome Pro (see `.npmrc.example` in the prototype). Without that access the app cannot be built.
- Run the prototype on port 6400 and the handoff on port 6500; the handoff's "Open prototype" button goes to `localhost:6400`.
