import { useState } from 'react'
import { Bookmark, Globe2, Heart, MessageCircle, MoreHorizontal, Repeat2, Send, Share2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { PlatformIcon } from './PlatformBadge'

const initials = name => (name || 'Your Brand').replace(/[^a-z0-9 ]/gi, '').trim().slice(0, 1).toUpperCase() || 'B'

function Media({ imageUrl, square }) {
  const [broken, setBroken] = useState(null)
  if (!imageUrl) return null
  if (broken === imageUrl) return <div className={`pv-media pv-media-missing ${square ? 'square' : ''}`}>Image can't be loaded — check that the URL is public</div>
  return <img className={`pv-media ${square ? 'square' : ''}`} src={imageUrl} alt="" onError={() => setBroken(imageUrl)} />
}

const Caption = ({ text, limit }) => {
  const body = text || 'Your caption will appear here…'
  return <p className={`pv-caption ${text ? '' : 'is-empty'}`}>{limit && body.length > limit ? `${body.slice(0, limit)}… more` : body}</p>
}

/* One renderer per platform. Adding a platform later (YouTube, Pinterest…) = add an entry here. */
const PREVIEWS = {
  Instagram: ({ name, content, imageUrl }) => <div className="pv-card pv-instagram">
    <div className="pv-head"><span className="pv-avatar ig">{initials(name)}</span><strong>{name}</strong><MoreHorizontal size={16} className="pv-more" /></div>
    {imageUrl ? <Media imageUrl={imageUrl} square /> : <div className="pv-media pv-media-missing square">Instagram posts need an image</div>}
    <div className="pv-actions"><Heart size={20} /><MessageCircle size={20} /><Send size={20} /><Bookmark size={20} className="pv-right" /></div>
    <div className="pv-body"><strong>0 likes</strong><div><strong>{name}</strong> <Caption text={content} limit={125} /></div><span className="pv-muted">Just now</span></div>
  </div>,
  Facebook: ({ name, content, imageUrl }) => <div className="pv-card pv-facebook">
    <div className="pv-head"><span className="pv-avatar fb">{initials(name)}</span><div><strong>{name}</strong><span className="pv-muted">Just now · <Globe2 size={11} /></span></div><MoreHorizontal size={16} className="pv-more" /></div>
    <div className="pv-body"><Caption text={content} limit={260} /></div>
    <Media imageUrl={imageUrl} />
    <div className="pv-reactions"><span><ThumbsUp size={16} /> Like</span><span><MessageCircle size={16} /> Comment</span><span><Share2 size={16} /> Share</span></div>
  </div>,
  LinkedIn: ({ name, content, imageUrl }) => <div className="pv-card pv-linkedin">
    <div className="pv-head"><span className="pv-avatar li">{initials(name)}</span><div><strong>{name}</strong><span className="pv-muted">Just now · <Globe2 size={11} /></span></div></div>
    <div className="pv-body"><Caption text={content} limit={210} /></div>
    <Media imageUrl={imageUrl} />
    <div className="pv-reactions"><span><ThumbsUp size={16} /> Like</span><span><MessageCircle size={16} /> Comment</span><span><Repeat2 size={16} /> Repost</span><span><Send size={16} /> Send</span></div>
  </div>,
  X: ({ name, content, imageUrl }) => <div className="pv-card pv-x">
    <div className="pv-head"><span className="pv-avatar x">{initials(name)}</span><div><strong>{name}</strong> <span className="pv-muted">@{(name || 'brand').replace(/\s+/g, '').toLowerCase()} · now</span></div></div>
    <div className="pv-body"><Caption text={content} /><span className={`pv-count ${(content || '').length > 280 ? 'over' : ''}`}>{(content || '').length}/280</span></div>
    {imageUrl && <div className="pv-x-media"><Media imageUrl={imageUrl} /></div>}
    <div className="pv-reactions"><span><MessageCircle size={16} /></span><span><Repeat2 size={16} /></span><span><Heart size={16} /></span><span><Share2 size={16} /></span></div>
  </div>,
  YouTube: ({ name, content, videoUrl, title }) => <div className="pv-card pv-youtube">
    {videoUrl ? <video className="pv-media pv-video" src={videoUrl} controls muted preload="metadata" /> : <div className="pv-media pv-media-missing pv-video">YouTube posts need a video URL</div>}
    <div className="pv-body">
      <strong className="pv-yt-title">{title || 'Your video title'}</strong>
      <div className="pv-head pv-yt-channel"><span className="pv-avatar yt">{initials(name)}</span><div><strong>{name}</strong><span className="pv-muted">0 subscribers</span></div><span className="pv-yt-sub">Subscribe</span></div>
      <div className="pv-yt-desc"><span className="pv-muted">0 views · Just now</span><Caption text={content} limit={160} /></div>
    </div>
    <div className="pv-reactions"><span><ThumbsUp size={16} /> 0</span><span><ThumbsDown size={16} /></span><span><Share2 size={16} /> Share</span></div>
  </div>,
}

export const PostPreview = ({ platforms = [], accountNames = {}, content, imageUrl, videoUrl, title }) => {
  const options = (platforms.length ? platforms : Object.keys(PREVIEWS)).filter(p => PREVIEWS[p])
  const [picked, setPicked] = useState(null)
  const active = options.includes(picked) ? picked : options[0]
  const Render = PREVIEWS[active]
  if (!Render) return null
  return <div className="post-preview">
    <div className="pv-tabs" role="tablist" aria-label="Preview platform">
      {options.map(p => <button key={p} type="button" role="tab" aria-selected={p === active} className={`pv-tab ${p === active ? 'active' : ''}`} onClick={() => setPicked(p)}><PlatformIcon platform={p} size={13} />{p}</button>)}
    </div>
    <div className="pv-stage"><Render name={accountNames[active] || 'Your Brand'} content={content} imageUrl={imageUrl} videoUrl={videoUrl} title={title} /></div>
  </div>
}

export default PostPreview
