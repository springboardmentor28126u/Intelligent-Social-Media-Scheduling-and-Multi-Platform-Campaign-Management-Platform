"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type HistoryItem = {
  id?: number;
  campaign_id?: number;
  recorded_at?: string | null;
  reach?: number | null;
  engagement?: number | null;
  clicks?: number | null;
  roi?: number | null;
};

type CampaignAnalyticsChartsProps = {
  analytics?: unknown;
  history: HistoryItem[];
  comparison?: unknown[];
};

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord {
  if (
    typeof value === "object" &&
    value !== null
  ) {
    return value as LooseRecord;
  }

  return {};
}

function numberValue(
  value: unknown
): number {
  return typeof value === "number"
    ? value
    : Number(value ?? 0);
}

export default function CampaignAnalyticsCharts({
  analytics,
  history,
  comparison = [],
}: CampaignAnalyticsChartsProps) {
  const analyticsData =
    asRecord(analytics);

  const historyData = history.map(
    (item, index) => ({
      point: index + 1,
      reach: Number(item.reach ?? 0),
      engagement: Number(
        item.engagement ?? 0
      ),
      clicks: Number(
        item.clicks ?? 0
      ),
      roi: Number(item.roi ?? 0),
    })
  );

  const comparisonData = comparison.map(
    (item, index) => {
      const data = asRecord(item);

      return {
        name:
          String(
            data.campaign_name ??
              data.name ??
              `Campaign ${index + 1}`
          ),
        reach: numberValue(
          data.actual_reach ??
            data.reach
        ),
        engagement: numberValue(
          data.actual_engagement ??
            data.engagement
        ),
        clicks: numberValue(
          data.actual_clicks ??
            data.clicks
        ),
        roi: numberValue(
          data.roi
        ),
      };
    }
  );

  const actualReach = numberValue(
    analyticsData.actual_reach ??
      analyticsData.reach
  );

  const actualEngagement =
    numberValue(
      analyticsData.actual_engagement ??
        analyticsData.engagement
    );

  const actualClicks = numberValue(
    analyticsData.actual_clicks ??
      analyticsData.clicks
  );

  const budgetUsed = numberValue(
    analyticsData.budget_used
  );

  return (
    <div className="mt-8 space-y-6">
      {/* =====================================================
          PERFORMANCE CARDS
      ===================================================== */}

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Performance Analytics
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard
            label="Reach"
            value={actualReach.toLocaleString(
              "en-IN"
            )}
          />

          <MetricCard
            label="Engagement"
            value={actualEngagement.toLocaleString(
              "en-IN"
            )}
          />

          <MetricCard
            label="Clicks"
            value={actualClicks.toLocaleString(
              "en-IN"
            )}
          />

          <MetricCard
            label="Budget Used"
            value={`${budgetUsed.toFixed(
              2
            )}%`}
          />
        </div>
      </section>

      {/* =====================================================
          PERFORMANCE HISTORY
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-slate-800">
            Performance History
          </h3>

          <p className="text-sm text-slate-500">
            Reach, engagement and clicks across recorded updates.
          </p>
        </div>

        {historyData.length > 0 ? (
          <div className="h-[350px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={historyData}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="point"
                  label={{
                    value: "Update",
                    position:
                      "insideBottom",
                    offset: -5,
                  }}
                />

                <YAxis />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="reach"
                  name="Reach"
                  strokeWidth={3}
                />

                <Line
                  type="monotone"
                  dataKey="engagement"
                  name="Engagement"
                  strokeWidth={3}
                />

                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No performance history available yet." />
        )}
      </section>

      {/* =====================================================
          ROI HISTORY
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-slate-800">
            ROI History
          </h3>

          <p className="text-sm text-slate-500">
            ROI recorded during campaign performance updates.
          </p>
        </div>

        {historyData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={historyData}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis dataKey="point" />

                <YAxis />

                <Tooltip
                  formatter={(value) =>
                    `${Number(
                      value ?? 0
                    ).toFixed(2)}%`
                  }
                />

                <Legend />

                <Bar
                  dataKey="roi"
                  name="ROI"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No ROI history available yet." />
        )}
      </section>

      {/* =====================================================
          CAMPAIGN COMPARISON
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-slate-800">
            Campaign Comparison
          </h3>

          <p className="text-sm text-slate-500">
            Compare reach, engagement and clicks across campaigns.
          </p>
        </div>

        {comparisonData.length > 0 ? (
          <div className="h-[350px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={comparisonData}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 12,
                  }}
                />

                <YAxis />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="reach"
                  name="Reach"
                />

                <Bar
                  dataKey="engagement"
                  name="Engagement"
                />

                <Bar
                  dataKey="clicks"
                  name="Clicks"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No campaign comparison data available." />
        )}
      </section>
    </div>
  );
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function EmptyChart({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex h-[230px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
      {message}
    </div>
  );
}