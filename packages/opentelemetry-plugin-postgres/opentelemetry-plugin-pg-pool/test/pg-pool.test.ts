/*!
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

import { NoopLogger } from '@opentelemetry/core';
import { NodeTracer } from '@opentelemetry/node';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/tracing';
import { SpanKind, Attributes, TimedEvent, Span } from '@opentelemetry/types';
import { plugin as pgPlugin, PostgresPlugin } from '@opentelemetry/plugin-pg';
import { plugin, PostgresPoolPlugin } from '../src';
import { AttributeNames } from '../src/enums';
import * as assert from 'assert';
import * as pg from 'pg';
import * as pgPool from 'pg-pool';
import * as assertionUtils from './assertionUtils';
import * as testUtils from './testUtils';

const memoryExporter = new InMemorySpanExporter();

const CONFIG = {
  user: process.env.POSTGRES_USER || 'postgres',
  database: process.env.POSTGRES_DB || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT
    ? parseInt(process.env.POSTGRES_PORT, 10)
    : 54320,
  maxClient: 1,
  idleTimeoutMillis: 10000,
};

const DEFAULT_PGPOOL_ATTRIBUTES = {
  [AttributeNames.COMPONENT]: PostgresPoolPlugin.COMPONENT,
  [AttributeNames.DB_INSTANCE]: CONFIG.database,
  [AttributeNames.DB_TYPE]: PostgresPoolPlugin.DB_TYPE,
  [AttributeNames.PEER_HOSTNAME]: CONFIG.host,
  [AttributeNames.PEER_ADDRESS]: `jdbc:postgresql://${CONFIG.host}:${CONFIG.port}/${CONFIG.database}`,
  [AttributeNames.PEER_PORT]: CONFIG.port,
  [AttributeNames.DB_USER]: CONFIG.user,
  [AttributeNames.MAX_CLIENT]: CONFIG.maxClient,
  [AttributeNames.IDLE_TIMEOUT_MILLIS]: CONFIG.idleTimeoutMillis,
};

const DEFAULT_PG_ATTRIBUTES = {
  [AttributeNames.COMPONENT]: PostgresPlugin.COMPONENT,
  [AttributeNames.DB_INSTANCE]: CONFIG.database,
  [AttributeNames.DB_TYPE]: PostgresPlugin.DB_TYPE,
  [AttributeNames.PEER_HOSTNAME]: CONFIG.host,
  [AttributeNames.PEER_ADDRESS]: `jdbc:postgresql://${CONFIG.host}:${CONFIG.port}/${CONFIG.database}`,
  [AttributeNames.PEER_PORT]: CONFIG.port,
  [AttributeNames.DB_USER]: CONFIG.user,
};

const runCallbackTest = (
  parentSpan: Span,
  attributes: Attributes,
  events: TimedEvent[],
  spansLength = 1,
  spansIndex = 0
) => {
  const spans = memoryExporter.getFinishedSpans();
  assert.strictEqual(spans.length, spansLength);
  const pgSpan = spans[spansIndex];
  assertionUtils.assertSpan(pgSpan, SpanKind.CLIENT, attributes, events);
  assertionUtils.assertPropagation(pgSpan, parentSpan);
};

describe('pg-pool@2.x', () => {
  let pool: pgPool<pg.Client>;
  const tracer = new NodeTracer();
  const logger = new NoopLogger();
  const testPostgres = process.env.TEST_POSTGRES; // For CI: assumes local postgres db is already available
  const testPostgresLocally = process.env.TEST_POSTGRES_LOCAL; // For local: spins up local postgres db via docker
  const shouldTest = testPostgres || testPostgresLocally; // Skips these tests if false (default)

  before(function(done) {
    if (!shouldTest) {
      // this.skip() workaround
      // https://github.com/mochajs/mocha/issues/2683#issuecomment-375629901
      this.test!.parent!.pending = true;
      this.skip();
    }
    pool = new pgPool(CONFIG);
    tracer.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
    if (testPostgresLocally) {
      testUtils.startDocker();
    }
    done();
  });

  after(function(done) {
    if (testPostgresLocally) {
      testUtils.cleanUpDocker();
    }
    pool.end(() => {
      done();
    });
  });

  beforeEach(function() {
    plugin.enable(pgPool, tracer, logger);
    pgPlugin.enable(pg, tracer, logger);
  });

  afterEach(() => {
    memoryExporter.reset();
    plugin.disable();
    pgPlugin.disable();
  });

  it('should return a plugin', () => {
    assert.ok(plugin instanceof PostgresPoolPlugin);
  });

  it('should have correct moduleName', () => {
    assert.strictEqual(plugin.moduleName, 'pg-pool');
  });

  describe('#pool.connect()', () => {
    // promise - checkout a client
    it('should intercept pool.connect()', async () => {
      const pgPoolattributes = {
        ...DEFAULT_PGPOOL_ATTRIBUTES,
      };
      const pgAttributes = {
        ...DEFAULT_PG_ATTRIBUTES,
        [AttributeNames.DB_STATEMENT]: 'SELECT NOW()',
      };
      const events: TimedEvent[] = [];
      const span = tracer.startSpan('test span');
      await tracer.withSpan(span, async () => {
        const client = await pool.connect();
        runCallbackTest(span, pgPoolattributes, events, 1, 0);
        assert.ok(client, 'pool.connect() returns a promise');
        try {
          await client.query('SELECT NOW()');
          runCallbackTest(span, pgAttributes, events, 2, 1);
        } catch (e) {
          throw e;
        } finally {
          client.release();
        }
      });
    });

    // callback - checkout a client
    it('should not return a promise if callback is provided', done => {
      const pgPoolattributes = {
        ...DEFAULT_PGPOOL_ATTRIBUTES,
      };
      const pgAttributes = {
        ...DEFAULT_PG_ATTRIBUTES,
        [AttributeNames.DB_STATEMENT]: 'SELECT NOW()',
      };
      const events: TimedEvent[] = [];
      const parentSpan = tracer.startSpan('test span');
      tracer.withSpan(parentSpan, () => {
        const resNoPromise = pool.connect((err, client, release) => {
          if (err) {
            return done(err);
          }
          release();
          assert.ok(client);
          runCallbackTest(parentSpan, pgPoolattributes, events, 1, 0);
          client.query('SELECT NOW()', (err, ret) => {
            if (err) {
              return done(err);
            }
            assert.ok(ret);
            runCallbackTest(parentSpan, pgAttributes, events, 2, 1);
            done();
          });
        });
        assert.strictEqual(resNoPromise, undefined, 'No promise is returned');
      });
    });
  });

  describe('#pool.query()', () => {
    // promise
    it('should call patched client.query()', async () => {
      const pgPoolattributes = {
        ...DEFAULT_PGPOOL_ATTRIBUTES,
      };
      const pgAttributes = {
        ...DEFAULT_PG_ATTRIBUTES,
        [AttributeNames.DB_STATEMENT]: 'SELECT NOW()',
      };
      const events: TimedEvent[] = [];
      const span = tracer.startSpan('test span');
      await tracer.withSpan(span, async () => {
        try {
          const result = await pool.query('SELECT NOW()');
          runCallbackTest(span, pgPoolattributes, events, 2, 0);
          runCallbackTest(span, pgAttributes, events, 2, 1);
          assert.ok(result, 'pool.query() returns a promise');
        } catch (e) {
          throw e;
        }
      });
    });

    // callback
    it('should not return a promise if callback is provided', done => {
      const pgPoolattributes = {
        ...DEFAULT_PGPOOL_ATTRIBUTES,
      };
      const pgAttributes = {
        ...DEFAULT_PG_ATTRIBUTES,
        [AttributeNames.DB_STATEMENT]: 'SELECT NOW()',
      };
      const events: TimedEvent[] = [];
      const parentSpan = tracer.startSpan('test span');
      tracer.withSpan(parentSpan, () => {
        const resNoPromise = pool.query('SELECT NOW()', (err, result) => {
          if (err) {
            return done(err);
          }
          runCallbackTest(parentSpan, pgPoolattributes, events, 2, 0);
          runCallbackTest(parentSpan, pgAttributes, events, 2, 1);
          done();
        });
        assert.strictEqual(resNoPromise, undefined, 'No promise is returned');
      });
    });
  });
});
