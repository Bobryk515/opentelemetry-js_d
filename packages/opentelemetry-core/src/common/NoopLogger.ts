/**
 * Copyright 2019, OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Logger } from '@opentelemetry/types';

/** No-op implementation of Logger */
export class NoopLogger implements Logger {
  // By default does nothing
  debug(message: string, ...args: unknown[]) {}

  // By default does nothing
  error(message: string, ...args: unknown[]) {}

  // By default does nothing
  warn(message: string, ...args: unknown[]) {}

  // By default does nothing
  info(message: string, ...args: unknown[]) {}
}
