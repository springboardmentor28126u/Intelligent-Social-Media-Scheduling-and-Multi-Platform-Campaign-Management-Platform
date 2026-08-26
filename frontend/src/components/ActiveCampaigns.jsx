import React from 'react';
import { Megaphone, Calendar, ArrowRight, MoreHorizontal } from 'lucide-react';
import { InstagramIcon, FacebookIcon, LinkedinIcon } from './SocialIcons';

const ActiveCampaigns = ({ onViewCampaign }) => {
  const campaigns = [];

  const getPlatformIcon = (name) => {
    switch (name) {
      case 'Instagram':
        return InstagramIcon;
      case 'Facebook':
        return FacebookIcon;
      case 'LinkedIn':
        return LinkedinIcon;
      default:
        return InstagramIcon;
    }
  };

  return (
    <div className="mb-6">
      {/* Title Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Active Campaigns
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Multi-platform campaign workflows and publishing progress
          </p>
        </div>

        <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1">
          <span>Manage All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Campaign Cards / Empty State */}
      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="group bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Title + Status */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {campaign.title}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Ends {campaign.endDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {campaign.status}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">
                      {campaign.percent}% complete
                    </span>
                    <span className="text-slate-500 font-medium">
                      {campaign.postsCount}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                    <div
                      className={`bg-gradient-to-r ${campaign.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${campaign.percent}%` }}
                    />
                  </div>
                </div>

                {/* Platforms */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-400 font-medium">Channels:</span>
                  <div className="flex items-center gap-1.5">
                    {campaign.platforms.map((platform) => {
                      const Icon = getPlatformIcon(platform);
                      return (
                        <span
                          key={platform}
                          title={platform}
                          className="p-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 text-xs flex items-center gap-1 px-2"
                        >
                          <Icon className="w-3 h-3" />
                          <span className="text-[11px] font-medium">{platform}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Auto-optimized
                </span>
                <button
                  onClick={onViewCampaign}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>View Campaign</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-white shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-2xs">
            <Megaphone className="w-5 h-5 stroke-[2]" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">No active campaigns</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Group your social media content by campaigns to track collective performance, goals, and publishing schedules.
          </p>
        </div>
      )}
    </div>
  );
};

export default ActiveCampaigns;
