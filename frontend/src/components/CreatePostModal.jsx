import React, { useState } from 'react';
import { X, Image, Calendar, Clock, Sparkles, Send, Check } from 'lucide-react';
import { InstagramIcon, FacebookIcon, LinkedinIcon, XIcon } from './SocialIcons';

const CreatePostModal = ({ isOpen, onClose }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState(['Instagram', 'LinkedIn']);
  const [postContent, setPostContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('2026-08-27');
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const platforms = [
    { id: 'Instagram', name: 'Instagram', icon: InstagramIcon, color: 'text-pink-600 bg-pink-50' },
    { id: 'Facebook', name: 'Facebook', icon: FacebookIcon, color: 'text-blue-600 bg-blue-50' },
    { id: 'LinkedIn', name: 'LinkedIn', icon: LinkedinIcon, color: 'text-sky-600 bg-sky-50' },
    { id: 'X', name: 'X / Twitter', icon: XIcon, color: 'text-slate-800 bg-slate-100' },
  ];

  const togglePlatform = (id) => {
    if (selectedPlatforms.includes(id)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== id));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const handlePublish = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create New Post</h3>
              <p className="text-xs text-slate-500">Draft & schedule content across channels</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isSubmitted ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-sm">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Post Scheduled!</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Your content is queued for multi-platform delivery on {scheduledDate} at {scheduledTime}.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePublish} className="p-5 space-y-4">
            {/* Target Platforms */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Select Channels
              </label>
              <div className="grid grid-cols-4 gap-2">
                {platforms.map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate">{p.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Post Body */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Caption / Post Content
              </label>
              <textarea
                rows={4}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Write your update here... Use #hashtags or @mentions"
                className="w-full text-xs text-slate-800 placeholder-slate-400 p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all resize-none"
                required
              />
            </div>

            {/* Media Upload Placeholder */}
            <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Image className="w-4 h-4 text-indigo-600" />
                <span>Attach Images, Videos, or GIF</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                Browse
              </span>
            </div>

            {/* Date & Time Picker */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full text-xs text-slate-800 p-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full text-xs text-slate-800 p-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Schedule Post</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreatePostModal;
