/*
 * Copyright The OpenTelemetry Authors
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

import { HrTime } from '@opentelemetry/api';
import { MetricAttributes } from '@opentelemetry/api-metrics';
import { InstrumentationScope } from '@opentelemetry/core';
import { Resource } from '@opentelemetry/resources';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
import { Histogram } from '../aggregator/types';
import { AggregationTemporality } from './AggregationTemporality';

/**
 * Basic metric data fields.
 */
export interface BaseMetricData {
  readonly descriptor: InstrumentDescriptor;
  readonly aggregationTemporality: AggregationTemporality;
  /**
   * DataPointType of the metric instrument.
   */
  readonly dataPointType: DataPointType;
}

/**
 * Represents a metric data aggregated by either a LastValueAggregation or
 * SumAggregation.
 */
export interface SingularMetricData extends BaseMetricData {
  readonly dataPointType: DataPointType.SINGULAR;
  readonly dataPoints: DataPoint<number>[];
}

/**
 * Represents a metric data aggregated by a HistogramAggregation.
 */
export interface HistogramMetricData extends BaseMetricData {
  readonly dataPointType: DataPointType.HISTOGRAM;
  readonly dataPoints: DataPoint<Histogram>[];
}

/**
 * Represents an aggregated metric data.
 */
export type MetricData = SingularMetricData | HistogramMetricData;

export interface ScopeMetrics {
  scope: InstrumentationScope;
  metrics: MetricData[];
}

export interface ResourceMetrics {
  resource: Resource;
  scopeMetrics: ScopeMetrics[];
}

/**
 * Represents the collection result of the metrics. If there are any
 * non-critical errors in the collection, like throwing in a single observable
 * callback, these errors are aggregated in the {@link CollectionResult.errors}
 * array and other successfully collected metrics are returned.
 */
export interface CollectionResult {
  /**
   * Collected metrics.
   */
  resourceMetrics: ResourceMetrics;
  /**
   * Arbitrary JavaScript exception values.
   */
  errors: unknown[];
}

/**
 * The aggregated point data type.
 */
export enum DataPointType {
  /**
   * A singular metric data point has only a single numeric value.
   */
  SINGULAR,
  /**
   * A histogram data point contains a histogram statistics of collected
   * values with a list of explicit bucket boundaries and statistics such
   * as min, max, count, and sum of all collected values.
   */
  HISTOGRAM,
  /**
   * An exponential histogram data point contains a histogram statistics of
   * collected values where bucket boundaries are automatically calculated
   * using an exponential function, and statistics such as min, max, count,
   * and sum of all collected values.
   */
  EXPONENTIAL_HISTOGRAM,
}

/**
 * Represents an aggregated point data with start time, end time and their
 * associated attributes and points.
 */
export interface DataPoint<T> {
  /**
   * The start epoch timestamp of the DataPoint, usually the time when
   * the metric was created when the preferred AggregationTemporality is
   * CUMULATIVE, or last collection time otherwise.
   */
  readonly startTime: HrTime;
  /**
   * The end epoch timestamp when data were collected, usually it represents
   * the moment when `MetricReader.collect` was called.
   */
  readonly endTime: HrTime;
  /**
   * The attributes associated with this DataPoint.
   */
  readonly attributes: MetricAttributes;
  /**
   * The value for this DataPoint. The type of the value is indicated by the
   * {@link DataPointType}.
   */
  readonly value: T;
}
