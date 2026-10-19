# js_hmi

With the sibling `js_utils` checkout at `../js_utils`, run `npm install` in
both repositories and `npm run build` in `js_utils`. Then run `npm start` here
to compile `main.ts` and start the HMI server. The runtime configuration
remains in `config.json`; database-stored JsonFX objects remain JavaScript and
continue to be evaluated at runtime by `js_utils`. The current TypeScript
build transpiles the legacy dynamic code without claiming full static type
checking.
