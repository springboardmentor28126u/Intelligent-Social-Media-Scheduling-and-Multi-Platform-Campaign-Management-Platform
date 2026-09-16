"use client";

import { useState } from "react";
import {
  Megaphone,
  Plus,
  Target,
  FileText,
  CheckCircle2,
  CalendarDays,
  Trash2,
  X,
} from "lucide-react";

type CampaignStatus =
  | "Draft"
  | "Active"
  | "Completed";

interface Campaign {
  id: number;
  name: string;
  objective: string;
  description: string;
  startDate: string;
  endDate: string;
  platforms: string[];
  status: CampaignStatus;
}

const platforms = [
  "Facebook",
  "Instagram",
  "LinkedIn",
  "X (Twitter)",
  "YouTube",
  "Pinterest",
];

const objectives = [
  "Brand Awareness",
  "Increase Engagement",
  "Drive Website Traffic",
  "Lead Generation",
  "Product Promotion",
  "Audience Growth",
];

/* -------------------------------------------------------
   DATE HELPER

   Returns the current local date in YYYY-MM-DD format.
   Using local time avoids UTC timezone date shifts.
------------------------------------------------------- */

function getCurrentLocalDate() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function CampaignsPage() {
  const [
    campaignName,
    setCampaignName,
  ] = useState("");

  const [
    objective,
    setObjective,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  const [
    selectedPlatforms,
    setSelectedPlatforms,
  ] = useState<string[]>([]);

  const [
    campaigns,
    setCampaigns,
  ] = useState<Campaign[]>([]);

  const [
    message,
    setMessage,
  ] = useState("");

  const totalCampaigns =
    campaigns.length;

  const activeCampaigns =
    campaigns.filter(
      (campaign) =>
        campaign.status ===
        "Active"
    ).length;

  const draftCampaigns =
    campaigns.filter(
      (campaign) =>
        campaign.status ===
        "Draft"
    ).length;

  const completedCampaigns =
    campaigns.filter(
      (campaign) =>
        campaign.status ===
        "Completed"
    ).length;

  const handlePlatformChange = (
    platform: string
  ) => {
    setSelectedPlatforms(
      (currentPlatforms) => {
        if (
          currentPlatforms.includes(
            platform
          )
        ) {
          return currentPlatforms.filter(
            (
              selectedPlatform
            ) =>
              selectedPlatform !==
              platform
          );
        }

        return [
          ...currentPlatforms,
          platform,
        ];
      }
    );
  };

  /* -------------------------------------------------------
     RESET FORM
  ------------------------------------------------------- */

  const resetForm = () => {
    setCampaignName("");

    setObjective("");

    setDescription("");

    setStartDate("");

    setEndDate("");

    setSelectedPlatforms([]);

    setMessage("");
  };

  /* -------------------------------------------------------
     CREATE CAMPAIGN
  ------------------------------------------------------- */

  const handleCreateCampaign =
    () => {
      setMessage("");

      const today =
        getCurrentLocalDate();

      if (
        !campaignName.trim()
      ) {
        setMessage(
          "Please enter a campaign name."
        );

        return;
      }

      if (!objective) {
        setMessage(
          "Please select a campaign objective."
        );

        return;
      }

      if (!startDate) {
        setMessage(
          "Please select a campaign start date."
        );

        return;
      }

      if (!endDate) {
        setMessage(
          "Please select a campaign end date."
        );

        return;
      }

      /*
        Prevent campaign start dates in the past.
      */

      if (
        startDate < today
      ) {
        setMessage(
          "The campaign start date cannot be in the past."
        );

        return;
      }

      /*
        Prevent campaign end dates in the past.
      */

      if (
        endDate < today
      ) {
        setMessage(
          "The campaign end date cannot be in the past."
        );

        return;
      }

      /*
        Prevent end dates before the selected
        campaign start date.
      */

      if (
        endDate < startDate
      ) {
        setMessage(
          "The campaign end date cannot be earlier than the start date."
        );

        return;
      }

      if (
        selectedPlatforms.length ===
        0
      ) {
        setMessage(
          "Please select at least one social media platform."
        );

        return;
      }

      const newCampaign: Campaign =
        {
          id: Date.now(),

          name:
            campaignName.trim(),

          objective,

          description:
            description.trim(),

          startDate,

          endDate,

          platforms:
            selectedPlatforms,

          status: "Draft",
        };

      setCampaigns(
        (
          currentCampaigns
        ) => [
          ...currentCampaigns,
          newCampaign,
        ]
      );

      setMessage(
        `Campaign "${campaignName.trim()}" created successfully.`
      );

      /*
        Clear form fields after successful creation.
        The success message remains visible.
      */

      setCampaignName("");

      setObjective("");

      setDescription("");

      setStartDate("");

      setEndDate("");

      setSelectedPlatforms([]);
    };

  /* -------------------------------------------------------
     UPDATE CAMPAIGN STATUS
  ------------------------------------------------------- */

  const updateCampaignStatus =
    (
      id: number,
      status: CampaignStatus
    ) => {
      setCampaigns(
        (
          currentCampaigns
        ) =>
          currentCampaigns.map(
            (
              campaign
            ) =>
              campaign.id ===
              id
                ? {
                    ...campaign,
                    status,
                  }
                : campaign
          )
      );
    };

  /* -------------------------------------------------------
     DELETE CAMPAIGN
  ------------------------------------------------------- */

  const deleteCampaign = (
    id: number
  ) => {
    setCampaigns(
      (
        currentCampaigns
      ) =>
        currentCampaigns.filter(
          (
            campaign
          ) =>
            campaign.id !==
            id
        )
    );
  };

  return (
    <div className="space-y-6">
      {/* ---------- Page Heading ---------- */}

      <div>
        <div className="flex items-center gap-2">
          <Megaphone
            className="text-indigo-600"
            size={24}
          />

          <h1 className="text-2xl font-bold text-gray-900">
            Campaigns
          </h1>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Plan and manage social media campaigns from
          one workspace.
        </p>
      </div>

      {/* ---------- Campaign Statistics ---------- */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total */}

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Total Campaigns
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {
                  totalCampaigns
                }
              </p>
            </div>

            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <Megaphone
                size={20}
              />
            </div>
          </div>
        </div>

        {/* Active */}

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Active
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {
                  activeCampaigns
                }
              </p>
            </div>

            <div className="rounded-lg bg-green-50 p-2.5 text-green-600">
              <CheckCircle2
                size={20}
              />
            </div>
          </div>
        </div>

        {/* Draft */}

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Draft
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {
                  draftCampaigns
                }
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <FileText
                size={20}
              />
            </div>
          </div>
        </div>

        {/* Completed */}

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Completed
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {
                  completedCampaigns
                }
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Target
                size={20}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Create Campaign ---------- */}

      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <Plus
                size={20}
              />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Create New Campaign
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Define your campaign goal, duration, and
                target platforms.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Campaign Name */}

          <div>
            <label
              htmlFor="campaignName"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Campaign Name
            </label>

            <input
              id="campaignName"
              type="text"
              value={
                campaignName
              }
              onChange={(
                event
              ) =>
                setCampaignName(
                  event.target.value
                )
              }
              placeholder="Enter campaign name"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Campaign Objective */}

          <div>
            <label
              htmlFor="objective"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Campaign Objective
            </label>

            <select
              id="objective"
              value={
                objective
              }
              onChange={(
                event
              ) =>
                setObjective(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">
                Select campaign objective
              </option>

              {objectives.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {
                      item
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* Description */}

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Campaign Description
            </label>

            <textarea
              id="description"
              value={
                description
              }
              onChange={(
                event
              ) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Describe the purpose and strategy of this campaign..."
              rows={5}
              className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm leading-6 text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* ---------- Dates ---------- */}

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Start Date */}

            <div>
              <label
                htmlFor="startDate"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <CalendarDays
                  size={16}
                  className="text-indigo-600"
                />

                Start Date
              </label>

              <input
                id="startDate"
                type="date"
                value={
                  startDate
                }
                min={
                  getCurrentLocalDate()
                }
                onChange={(
                  event
                ) => {
                  const newStartDate =
                    event.target
                      .value;

                  setStartDate(
                    newStartDate
                  );

                  /*
                    If changing the start date makes
                    the existing end date invalid,
                    automatically clear the end date.
                  */

                  if (
                    endDate &&
                    newStartDate &&
                    endDate <
                      newStartDate
                  ) {
                    setEndDate(
                      ""
                    );
                  }
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <p className="mt-2 text-xs text-gray-500">
                The campaign cannot start in the past.
              </p>
            </div>

            {/* End Date */}

            <div>
              <label
                htmlFor="endDate"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <CalendarDays
                  size={16}
                  className="text-indigo-600"
                />

                End Date
              </label>

              <input
                id="endDate"
                type="date"
                value={
                  endDate
                }
                min={
                  startDate
                    ? startDate
                    : getCurrentLocalDate()
                }
                disabled={
                  !startDate
                }
                onChange={(
                  event
                ) =>
                  setEndDate(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              />

              <p className="mt-2 text-xs text-gray-500">
                {!startDate
                  ? "Select a campaign start date first."
                  : "The end date cannot be earlier than the start date."}
              </p>
            </div>
          </div>

          {/* ---------- Platforms ---------- */}

          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Target Platforms
            </label>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {platforms.map(
                (
                  platform
                ) => {
                  const isSelected =
                    selectedPlatforms.includes(
                      platform
                    );

                  return (
                    <label
                      key={
                        platform
                      }
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={
                          isSelected
                        }
                        onChange={() =>
                          handlePlatformChange(
                            platform
                          )
                        }
                        className="h-4 w-4 accent-indigo-600"
                      />

                      <span className="font-medium">
                        {
                          platform
                        }
                      </span>
                    </label>
                  );
                }
              )}
            </div>
          </div>

          {/* ---------- Message ---------- */}

          {message && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                message.includes(
                  "successfully"
                )
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {
                message
              }
            </div>
          )}

          {/* ---------- Buttons ---------- */}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={
                resetForm
              }
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <X
                size={17}
              />

              Clear
            </button>

            <button
              type="button"
              onClick={
                handleCreateCampaign
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              <Plus
                size={17}
              />

              Create Campaign
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Campaign List ---------- */}

      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="font-semibold text-gray-900">
            Your Campaigns
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Campaigns created in your SocialPilot
            workspace.
          </p>
        </div>

        {campaigns.length ===
        0 ? (
          <div className="px-6 py-12 text-center">
            <Megaphone
              size={34}
              className="mx-auto text-gray-300"
            />

            <p className="mt-4 text-sm font-medium text-gray-700">
              No campaigns created yet
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Create your first campaign using the form
              above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {campaigns.map(
              (
                campaign
              ) => (
                <div
                  key={
                    campaign.id
                  }
                  className="px-6 py-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {
                            campaign.name
                          }
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            campaign.status ===
                            "Active"
                              ? "bg-green-50 text-green-700"
                              : campaign.status ===
                                "Completed"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {
                            campaign.status
                          }
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-medium text-indigo-600">
                        {
                          campaign.objective
                        }
                      </p>

                      {campaign.description && (
                        <p className="mt-2 text-sm leading-6 text-gray-500">
                          {
                            campaign.description
                          }
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                        <span>
                          {
                            campaign.startDate
                          }{" "}
                          →{" "}
                          {
                            campaign.endDate
                          }
                        </span>

                        <span>
                          {campaign.platforms.join(
                            ", "
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Campaign Actions */}

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={
                          campaign.status
                        }
                        onChange={(
                          event
                        ) =>
                          updateCampaignStatus(
                            campaign.id,
                            event
                              .target
                              .value as CampaignStatus
                          )
                        }
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-indigo-500"
                      >
                        <option value="Draft">
                          Draft
                        </option>

                        <option value="Active">
                          Active
                        </option>

                        <option value="Completed">
                          Completed
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCampaign(
                            campaign.id
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50"
                        aria-label={`Delete ${campaign.name}`}
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}