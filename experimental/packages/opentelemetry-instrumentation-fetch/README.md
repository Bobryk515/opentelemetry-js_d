# OpenTelemetry Fetch Instrumentation for web

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This module provides auto instrumentation for web using [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch).
(Note: This instrumentation does **not** instrument [Node.js' fetch](https://nodejs.org/api/globals.html#fetch). See [`@opentelemetry/instrumentation-undici`](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/instrumentation-undici/) for that.)

## Installation

```bash
npm install --save @opentelemetry/instrumentation-fetch
```

## Usage

```js
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const provider = new WebTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())]
});

provider.register({
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [new FetchInstrumentation()],
});

// or plugin can be also initialised separately and then set the tracer provider or meter provider
const fetchInstrumentation = new FetchInstrumentation();
const provider = new WebTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())]
});
provider.register({
  contextManager: new ZoneContextManager(),
});
fetchInstrumentation.setTracerProvider(provider);

// and some test

fetch('http://localhost:8090/fetch.js');

```

## Example Screenshots

![Screenshot of the running example](images/trace1.png)
![Screenshot of the running example](images/trace2.png)
![Screenshot of the running example](images/trace3.png)

See [examples/tracer-web/fetch](https://github.com/open-telemetry/opentelemetry-js/tree/main/examples/tracer-web) for a short example.

### Fetch Instrumentation options

Fetch instrumentation plugin has few options available to choose from. You can set the following:

| Options | Type | Description |
| ------- | ---- | ----------- |
| [`applyCustomAttributesOnSpan`](https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-fetch/src/fetch.ts#L83) | `FetchCustomAttributeFunction` | Function for adding custom attributes |
| [`requestHook`](https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-fetch/src/fetch.ts#L85) | `FetchRequestHookFunction` | Function for adding custom attributes or headers before the request is handled |
| [`ignoreNetworkEvents`](https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-fetch/src/fetch.ts#L87) | `boolean`| Disable network events being added as span events (network events are added by default) |
| [`measureRequestSize`](https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-fetch/src/fetch.ts#L89) | `boolean` | Measure outgoing request length (outgoing request length is not measured by default)    |

## Semantic Conventions

This package uses `@opentelemetry/semantic-conventions` version `1.22+`, which implements Semantic Convention [Version 1.7.0](https://github.com/open-telemetry/opentelemetry-specification/blob/v1.7.0/semantic_conventions/README.md)

Attributes collected:

| Attribute                                   | Short Description                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `http.status_code`                          | HTTP response status code                                                      |
| `http.host`                                 | The value of the HTTP host header                                              |
| `http.user_agent`                           | Value of the HTTP User-Agent header sent by the client                         |
| `http.scheme`                               | The URI scheme identifying the used protocol                                   |
| `http.url`                                  | Full HTTP request URL                                                          |
| `http.method`                               | HTTP request method                                                            |
| `http.request_content_length_uncompressed`  | Uncompressed size of the request body, if any body exists                      |

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-fetch
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-fetch.svg
