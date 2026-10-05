import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Bell, BookHeart, Bookmark, Camera, Check, ChevronLeft, ChevronRight, CirclePlus, Ellipsis, Heart, Home, ImagePlus, Mail, MessageCircle, Moon, Pencil, Plus, Search, Send, Settings2, Share2, Sparkles, Trash2, Flag, WandSparkles, X } from 'lucide-react'
import { generateKidsStory } from './kidsStory'
import { supabase, PROFILE_BUCKET, deviceId, resizeImage, blobToDataUrl } from './supabase'

type Profile = { name: string; handle: string; bio: string; avatarUrl?: string; coverUrl?: string }

type Tab = 'home' | 'stories' | 'create' | 'chats' | 'profile'
type Post = { id: number; author: string; handle: string; avatar: string; time: string; text: string; image?: string; likes: number; comments: number; liked?: boolean; saved?: boolean }
type ChatMessage = { id?: string; from: 'me' | 'them'; text: string; time: string }
type KidStory = { id?: string; title: string; child: string; theme: string; text: string; date: string }

const photos = {
  friends: 'https://images.unsplash.com/photo-1520880867055-1e30d1cb001c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDU0ODQzfDB8MXxzZWFyY2h8MXx8ZnJpZW5kcyUyMGxhdWdoaW5nJTIwdG9nZXRoZXIlMjBvdXRkb29ycyUyMGNhbmRpZCUyMHdhcm0lMjBzdW5saWdodHxlbnwxfHx8fDE3OTAzNTQ5NTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
  portrait: 'https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDU0ODQzfDB8MXxzZWFyY2h8MXx8d29tYW4lMjBwb3J0cmFpdCUyMG5hdHVyYWwlMjBzbWlsaW5nfGVufDF8fHx8MTc5MDM1NDk1MXww&ixlib=rb-4.1.0&q=80&w=1080',
  reading: 'https://images.unsplash.com/photo-1758874961197-893028499f9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDU0ODQzfDB8MXxzZWFyY2h8Mnx8Y296eSUyMGZhbWlseSUyMHJlYWRpbmclMjBib29rJTIwY2hpbGQlMjBpbGx1c3RyYXRpb258ZW58MXx8fHwxNzkwMzU0OTUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  picnic: 'https://images.unsplash.com/photo-1658227412301-75d89b92aae0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDU0ODQzfDB8MXxzZWFyY2h8Mnx8d2Vla2VuZCUyMHBpY25pYyUyMHBhcmslMjBmcmllbmRzJTIwY2FuZGlkfGVufDF8fHx8MTc5MDM1NDk1MXww&ixlib=rb-4.1.0&q=80&w=1080',
}
const people = [
  { name: 'Maya Chen', initial: 'M', color: 'peach', image: photos.portrait },
  { name: 'Olivia Park', initial: 'O', color: 'lilac' },
  { name: 'Leo Martin', initial: 'L', color: 'sage' },
  { name: 'Nina Rose', initial: 'N', color: 'yellow' },
]
const initialPosts: Post[] = [
  { id: 1, author: 'Maya Chen', handle: 'mayachen', avatar: 'M', time: '2 hours ago', text: 'The best kind of afternoons are the ones that turn into memories. A little sunshine, good friends, and nowhere else to be. ☀️', image: photos.friends, likes: 128, comments: 18 },
  { id: 2, author: 'Olivia Park', handle: 'oliviap', avatar: 'O', time: 'Yesterday', text: 'A reminder to slow down and celebrate the little things. Made time for a long walk and a really good cup of coffee today.', likes: 86, comments: 12 },
  { id: 3, author: 'Leo Martin', handle: 'leom', avatar: 'L', time: 'Yesterday', text: 'Weekend plans: fresh air, shared snacks, and absolutely no schedule. 🌿', image: photos.picnic, likes: 94, comments: 9 },
]
const initialConversations: Record<string, ChatMessage[]> = {
  'Maya Chen': [{ from: 'them', text: 'Hey! So lovely seeing you this weekend.', time: '10:42' }, { from: 'me', text: 'I had the best time! We should do it again soon.', time: '10:45' }, { from: 'them', text: 'Absolutely! Are you free on Saturday? ☀️', time: '10:48' }],
  'Olivia Park': [{ from: 'them', text: 'I found that little bookstore we talked about!', time: 'Yesterday' }],
  'Leo Martin': [{ from: 'them', text: 'Thanks for sharing those photos 🙌', time: 'Tuesday' }],
  'Nina Rose': [{ from: 'them', text: 'Coffee next week?', time: 'Monday' }],
}
const tabs: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Home', Icon: Home }, { id: 'stories', label: 'Stories', Icon: CirclePlus }, { id: 'create', label: 'Kids Stories', Icon: BookHeart }, { id: 'chats', label: 'Chats', Icon: MessageCircle }, { id: 'profile', label: 'Profile', Icon: Settings2 },
]
const readStore = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback } }

function Avatar({ name, image, size = 'normal', color = 'peach' }: { name: string; image?: string; size?: 'small' | 'normal' | 'large'; color?: string }) {
  return <span className={`avatar avatar-${size} avatar-${color}`}>{image ? <img src={image} alt={name} /> : name.charAt(0).toUpperCase()}</span>
}

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [profile, setProfile] = useState<Profile>(() => readStore<Profile>('mn-profile', { name: 'Alex Morgan', handle: 'alexmorgan', bio: 'Collecting little moments and good stories. ✨' }))
  const [posts, setPosts] = useState<Post[]>(() => readStore('mn-posts', initialPosts))
  const [dailyStories, setDailyStories] = useState<{ id?: string | number; name: string; text: string; image?: string }[]>(() => readStore('mn-daily', [{ name: 'Maya Chen', text: 'An afternoon worth remembering ☀️', image: photos.friends }, { name: 'Olivia Park', text: 'A little joy in the everyday.', image: photos.portrait }, { name: 'Leo Martin', text: 'Out here making memories.', image: photos.picnic }]))
  const [kidStories, setKidStories] = useState<KidStory[]>(() => readStore('mn-kids', []))
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>(() => readStore('mn-chats', initialConversations))
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [modal, setModal] = useState<'post' | 'story' | 'profile' | 'account' | 'notifications' | 'delete' | null>(null)
  const [selectedStory, setSelectedStory] = useState<number | null>(null)
  const [postText, setPostText] = useState('')
  const [postImage, setPostImage] = useState('')
  const [storyText, setStoryText] = useState('')
  const [storyImage, setStoryImage] = useState('')
  const [postFile, setPostFile] = useState<Blob | null>(null)
  const [savingPost, setSavingPost] = useState(false)
  const [storyMenu, setStoryMenu] = useState(false)
  const [storyFile, setStoryFile] = useState<Blob | null>(null)
  const [savingStory, setSavingStory] = useState(false)
  const [menuPost, setMenuPost] = useState<number | null>(null)
  const [draftProfile, setDraftProfile] = useState(profile)
  const [childName, setChildName] = useState('')
  const [theme, setTheme] = useState('A magical adventure')
  const [age, setAge] = useState('4–6 years')
  const [generated, setGenerated] = useState<KidStory | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [showComments, setShowComments] = useState<number | null>(null)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Record<number, string[]>>({})
  const [toast, setToast] = useState('')
  const [isMember, setIsMember] = useState(() => readStore('mn-member', false))
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [accountMode, setAccountMode] = useState<'join' | 'login'>('join')

  useEffect(() => { localStorage.setItem('mn-profile', JSON.stringify(profile)) }, [profile])
  useEffect(() => { localStorage.setItem('mn-posts', JSON.stringify(posts)) }, [posts])
  useEffect(() => { localStorage.setItem('mn-daily', JSON.stringify(dailyStories)) }, [dailyStories])
  useEffect(() => { localStorage.setItem('mn-kids', JSON.stringify(kidStories)) }, [kidStories])
  useEffect(() => { localStorage.setItem('mn-chats', JSON.stringify(conversations)) }, [conversations])
  useEffect(() => { localStorage.setItem('mn-member', JSON.stringify(isMember)) }, [isMember])
  useEffect(() => { if (toast) { const timeout = window.setTimeout(() => setToast(''), 3000); return () => clearTimeout(timeout) } }, [toast])

  const [avatarFile, setAvatarFile] = useState<Blob | null>(null)
  const [coverFile, setCoverFile] = useState<Blob | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const shown = modal === 'profile' ? draftProfile : profile
  const pickImage = async (event: React.ChangeEvent<HTMLInputElement>, kind: 'avatar' | 'cover') => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setToast('Please choose an image file'); return }
    try {
      const blob = await resizeImage(file, kind === 'avatar' ? 512 : 1400)
      const url = URL.createObjectURL(blob)
      if (kind === 'avatar') { setAvatarFile(blob); setDraftProfile(d => ({ ...d, avatarUrl: url })) }
      else { setCoverFile(blob); setDraftProfile(d => ({ ...d, coverUrl: url })) }
    } catch { setToast('Could not read that image') }
  }
  const saveProfile = async () => {
    if (savingProfile || !draftProfile.name.trim() || !draftProfile.handle.trim()) return
    setSavingProfile(true)
    let cloud = true
    const upload = async (blob: Blob, kind: string) => {
      try {
        const path = `${deviceId}/${kind}-${Date.now()}.jpg`
        const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
        return supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl
      } catch { cloud = false; return blobToDataUrl(blob) }
    }
    const next: Profile = { ...draftProfile }
    if (avatarFile) next.avatarUrl = await upload(avatarFile, 'avatar')
    if (coverFile) next.coverUrl = await upload(coverFile, 'cover')
    try {
      const { error } = await supabase.from('profiles').upsert({ device_id: deviceId, name: next.name, handle: next.handle, bio: next.bio, avatar_url: next.avatarUrl?.startsWith('data:') ? null : next.avatarUrl ?? null, cover_url: next.coverUrl?.startsWith('data:') ? null : next.coverUrl ?? null, updated_at: new Date().toISOString() })
      if (error) throw error
    } catch { cloud = false }
    setProfile(next); setAvatarFile(null); setCoverFile(null); setSavingProfile(false); setModal(null)
    setToast(cloud ? 'Profile updated' : 'Profile saved on this device — cloud storage isn’t reachable yet')
  }
  const openTab = (next: Tab) => { setTab(next); setActiveChat(null); setGenerated(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const toggleLike = (id: number) => setPosts(items => items.map(post => post.id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post))
  const toggleSave = (id: number) => { setPosts(items => items.map(post => post.id === id ? { ...post, saved: !post.saved } : post)); setToast('Saved posts are available on your profile') }
  const pickPostImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setToast('Please choose an image file'); return }
    try { const blob = await resizeImage(file, 1280); setPostFile(blob); setPostImage(URL.createObjectURL(blob)) } catch { setToast('Could not read that image') }
  }
  const publishPost = async () => {
    const text = postText.trim().normalize('NFC')
    if (!text || savingPost) return
    setSavingPost(true)
    let cloud = true
    let imageUrl: string | undefined
    if (postFile) {
      try {
        const path = `${deviceId}/post-${Date.now()}.jpg`
        const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, postFile, { contentType: 'image/jpeg' })
        if (error) throw error
        imageUrl = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl
      } catch (error) { console.warn('Post upload failed', error); cloud = false; imageUrl = await blobToDataUrl(postFile) }
    }
    try {
      const { error } = await supabase.from('posts').insert({ user_id: deviceId, content: text, image_url: imageUrl?.startsWith('data:') ? null : imageUrl ?? null })
      if (error) throw error
    } catch (error) { console.warn('Post insert failed', error); cloud = false }
    setPosts(items => [{ id: Date.now(), author: profile.name, handle: profile.handle, avatar: profile.name.charAt(0), time: 'Just now', text, image: imageUrl, likes: 0, comments: 0 }, ...items])
    setPostText(''); setPostImage(''); setPostFile(null); setSavingPost(false); setModal(null); setTab('home')
    setToast(cloud ? 'Your moment is live!' : 'Posted here, but it could not be saved to the cloud')
  }
  const deleteStory = async (index: number) => {
    const story = dailyStories[index]
    if (!story) return
    setStoryMenu(false); setSelectedStory(null)
    setDailyStories(items => items.filter((_, i) => i !== index))
    setToast('Story deleted')
    if (story.id === undefined) return
    try { const { error } = await supabase.from('stories').delete().eq('id', story.id); if (error) throw error } catch (error) { console.warn('Story delete failed', error); setToast('Removed here, but the database couldn’t be updated') }
  }
  const shareStory = async (index: number) => {
    const story = dailyStories[index]; setStoryMenu(false)
    const data = { title: 'MingleNest story', text: `${story.name}: ${story.text}`, url: window.location.href }
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); setToast('Story link copied to clipboard') } } catch { /* share cancelled */ }
  }
  const canDeletePost = (post: Post) => post.author === profile.name || import.meta.env.DEV || !isMember
  const pickStoryImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setToast('Please choose an image file'); return }
    try { const blob = await resizeImage(file, 1080); setStoryFile(blob); setStoryImage(URL.createObjectURL(blob)) } catch { setToast('Could not read that image') }
  }
  const publishStory = async () => {
    const caption = storyText.trim().normalize('NFC')
    if ((!caption && !storyFile) || savingStory) return
    setSavingStory(true)
    let cloud = true
    let mediaUrl: string | undefined
    if (storyFile) {
      try {
        const path = `${deviceId}/story-${Date.now()}.jpg`
        const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, storyFile, { contentType: 'image/jpeg' })
        if (error) throw error
        mediaUrl = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl
      } catch (error) { console.warn('Story upload failed', error); cloud = false; mediaUrl = await blobToDataUrl(storyFile) }
    }
    let storyId: string | number | undefined
    if (cloud) {
      try {
        const { data, error } = await supabase.from('stories').insert({ user_id: deviceId, media_url: mediaUrl ?? null, caption }).select('id').single()
        if (error) throw error
        storyId = data?.id
      } catch (error) { console.warn('Story insert failed', error); cloud = false }
    }
    setDailyStories(items => [{ id: storyId, name: profile.name, text: caption, image: mediaUrl }, ...items])
    setStoryText(''); setStoryImage(''); setStoryFile(null); setSavingStory(false); setModal(null)
    setToast(cloud ? 'Story shared with your circle' : 'Story added here, but it could not be saved to the cloud')
  }
  const deleteMessage = async (chat: string, message: ChatMessage, index: number) => {
    setConversations(current => ({ ...current, [chat]: (current[chat] || []).filter((m, i) => message.id ? m.id !== message.id : i !== index) }))
    if (!message.id) return
    try { const { error } = await supabase.from('messages').delete().eq('id', message.id); if (error) throw error } catch (error) { console.warn('Message delete failed', error); setToast('Removed here, but the database couldn’t be updated') }
  }
  const deleteKidStory = async (story: KidStory, index: number) => {
    if (!window.confirm(`Delete “${story.title}” from your story shelf?`)) return
    setKidStories(items => items.filter((s, i) => story.id ? s.id !== story.id : i !== index))
    setToast('Story deleted')
    if (!story.id) return
    try { const { error } = await supabase.from('kids_stories').delete().eq('id', story.id); if (error) throw error } catch (error) { console.warn('Kids story delete failed', error); setToast('Removed here, but the database couldn’t be updated') }
  }
  const deletePost = async (id: number) => {
    setMenuPost(null)
    setPosts(items => items.filter(p => p.id !== id))
    setToast('Post deleted')
    try { const { error } = await supabase.from('posts').delete().eq('id', id); if (error) throw error } catch (error) { console.warn('Post delete failed', error); setToast('Removed here, but the database couldn’t be updated') }
  }
  const sendMessage = () => { if (!activeChat || !chatInput.trim()) return; setConversations(current => ({ ...current, [activeChat]: [...(current[activeChat] || []), { id: crypto.randomUUID(), from: 'me', text: chatInput.trim().normalize('NFC'), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] })); setChatInput('') }
  const addComment = (id: number) => { if (!commentText.trim()) return; setComments(current => ({ ...current, [id]: [...(current[id] || []), commentText.trim().normalize('NFC')] })); setPosts(items => items.map(post => post.id === id ? { ...post, comments: post.comments + 1 } : post)); setCommentText('') }
  const makeStory = async () => {
    if (isGenerating) return
    if (!childName.trim()) { setToast('Add a child’s name to begin'); return }
    const child = childName.trim(); const idea = theme.trim() || 'a magical adventure'
    setIsGenerating(true)
    try {
      const { title, text } = await generateKidsStory({ child, age, topic: idea })
      setGenerated({ title, child, theme: idea, text, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not create a story. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }
  const saveKidStory = () => { if (!generated) return; setKidStories(items => [{ ...generated, id: generated.id ?? crypto.randomUUID() }, ...items]); setToast('Saved to your story library'); setGenerated(null) }
  const submitAccount = (event: React.FormEvent) => { event.preventDefault(); if (accountMode === 'join' && accountName.trim()) setProfile({ ...profile, name: accountName.trim(), handle: accountName.trim().toLowerCase().replace(/\s+/g, '') }); setIsMember(true); setModal(null); setToast(accountMode === 'join' ? 'Welcome to the nest!' : 'Welcome back!'); setAccountPassword('') }

  return <div className="app-shell">
    <aside className="desktop-rail">
      <button className="brand desktop-brand" onClick={() => openTab('home')} aria-label="MingleNest home"><span className="brand-mark"><img src="/minglenest-logo.png" alt="" /></span><span>Mingle<span className="brand-light">Nest</span></span></button>
      <div className="rail-caption">YOUR LITTLE CORNER OF THE WORLD</div>
      <nav className="rail-nav" aria-label="Main navigation">{tabs.map(({ id, label, Icon }) => <button key={id} className={`rail-link ${tab === id ? 'active' : ''}`} onClick={() => openTab(id)}><Icon size={21} strokeWidth={tab === id ? 2.3 : 1.9} /><span>{label}</span>{id === 'chats' && <span className="nav-dot" />}</button>)}</nav>
      <div className="rail-bottom"><div className="rail-note"><span className="note-sparkle"><Sparkles size={20} /></span><strong>Make a little magic</strong><p>Turn their big imagination into a bedtime story.</p><button onClick={() => openTab('create')}>Create a story <ArrowRight size={15} /></button></div><button className="rail-person" onClick={() => openTab('profile')}><Avatar name={profile.name} image={profile.avatarUrl} size="small" color="sage" /><span><strong>{profile.name}</strong><small>@{profile.handle}</small></span><ChevronRight size={18} /></button></div>
    </aside>

    <main className="main-area">
      <header className="mobile-topbar"><button className="brand" onClick={() => openTab('home')} aria-label="MingleNest home"><span className="brand-mark"><img src="/minglenest-logo.png" alt="" /></span><span>Mingle<span className="brand-light">Nest</span></span></button><button className="icon-button" onClick={() => setModal('notifications')} aria-label="Notifications"><Bell size={21} /></button></header>
      <div className="page-content">
      {tab === 'home' && <>
        <div className="home-heading"><div><div className="eyebrow">YOUR SPACE TO CONNECT <span className="eyebrow-line" /></div><h1>Good to see you, <em>{profile.name.split(' ')[0]}.</em></h1><p>Here’s what’s happening in your little corner of the world.</p></div><button className="desktop-action" onClick={() => setModal('post')}><Plus size={18} /> Share a moment</button></div>
        <div className="home-layout"><div className="feed-column">
          <section className="story-strip"><div className="section-row"><h2>Little moments</h2><button className="text-link" onClick={() => openTab('stories')}>See all <ArrowRight size={15} /></button></div><div className="story-avatars"><button className="story-person" onClick={() => setModal('story')}><span className="add-story-ring"><span><Plus size={24} /></span></span><small>Your story</small></button>{dailyStories.slice(0, 5).map((story, index) => <button className="story-person" key={`${story.name}-${index}`} onClick={() => setSelectedStory(index)}><span className="story-ring"><Avatar name={story.name} image={story.image} color={people[index % people.length].color} size="large" /></span><small>{story.name.split(' ')[0]}</small></button>)}</div></section>
          <button className="composer" onClick={() => setModal('post')}><Avatar name={profile.name} color="sage" size="small" /><span>What's on your mind, {profile.name.split(' ')[0]}?</span><span className="composer-plus"><Plus size={18} /></span></button>
          <div className="section-row feed-title"><div><h2>From your circle</h2><p>The moments worth sharing</p></div><span className="feed-label">LATEST</span></div>
          <div className="post-list">{posts.map(post => <article className="post-card" key={post.id}><div className="post-header"><Avatar name={post.author} image={post.author === 'Maya Chen' ? photos.portrait : undefined} color={post.author === 'Olivia Park' ? 'lilac' : post.author === 'Leo Martin' ? 'sage' : 'yellow'} /><div className="post-author"><strong>{post.author}</strong><span>@{post.handle} · {post.time}</span></div><div className="post-menu-wrap"><button className="subtle-icon" onClick={() => setMenuPost(menuPost === post.id ? null : post.id)} aria-label="More post options" aria-expanded={menuPost === post.id}><Ellipsis size={21} /></button>{menuPost === post.id && <><div className="menu-scrim" onClick={() => setMenuPost(null)} /><div className="post-menu" role="menu">{canDeletePost(post) && <button role="menuitem" className="danger" onClick={() => deletePost(post.id)}><Trash2 size={16} /> Delete Post</button>}<button role="menuitem" onClick={() => { setMenuPost(null); setToast('Thanks — we’ll review this post') }}><Flag size={16} /> Report Post</button></div></>}</div></div><p className="post-text">{post.text}</p>{post.image && <img className="post-image" src={post.image} alt={`A moment shared by ${post.author}`} />}<div className="post-actions"><button className={post.liked ? 'liked' : ''} onClick={() => toggleLike(post.id)} aria-label="Like post"><Heart size={19} fill={post.liked ? 'currentColor' : 'none'} /><span>{post.likes}</span></button><button onClick={() => setShowComments(showComments === post.id ? null : post.id)} aria-label="View comments"><MessageCircle size={19} /><span>{post.comments}</span></button><button onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast('Link copied to clipboard') }} aria-label="Share post"><Share2 size={18} /><span>Share</span></button><button className={`save-action ${post.saved ? 'liked' : ''}`} onClick={() => toggleSave(post.id)} aria-label="Save post"><Bookmark size={19} fill={post.saved ? 'currentColor' : 'none'} /></button></div>{showComments === post.id && <div className="comments-area"><p>Join the conversation</p>{(comments[post.id] || []).map((comment, index) => <div className="comment" key={index}><strong>{profile.name}</strong> {comment}</div>)}<form onSubmit={e => { e.preventDefault(); addComment(post.id) }}><input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a kind comment..." aria-label="Write a comment" /><button type="submit" aria-label="Send comment"><Send size={17} /></button></form></div>}</article>)}</div>
        </div><aside className="home-side"><div className="welcome-card"><div className="welcome-icon"><Heart size={20} fill="currentColor" /></div><h3>A place to feel at home.</h3><p>Share the ordinary, celebrate the extraordinary, and stay close to your people.</p><span>GOOD THINGS GROW TOGETHER</span></div><div className="side-section"><div className="section-row"><h3>Your people</h3><button onClick={() => openTab('chats')} className="text-link">View chats <ArrowRight size={14} /></button></div>{people.slice(0, 3).map(person => <button className="person-row" key={person.name} onClick={() => { setActiveChat(person.name); setTab('chats') }}><Avatar name={person.name} image={person.image} color={person.color} size="small" /><span><strong>{person.name}</strong><small>Say hello</small></span><MessageCircle size={17} /></button>)}</div></aside></div>
      </>}

      {tab === 'stories' && <div className="standard-page"><div className="page-heading"><div className="eyebrow">LIFE, AS IT HAPPENS <span className="eyebrow-line" /></div><h1>Daily <em>stories.</em></h1><p>A little window into the moments your people are making.</p></div><button className="primary-button story-create" onClick={() => setModal('story')}><Plus size={18} /> Add to your story</button><div className="story-grid">{dailyStories.map((story, index) => <button className={`story-tile story-tile-${index % 4}`} key={`${story.name}-${index}`} onClick={() => setSelectedStory(index)}>{story.image && <img src={story.image} alt="" />}<div className="story-tile-shade" /><div className="story-tile-top"><Avatar name={story.name} image={story.name === 'Olivia Park' ? photos.portrait : undefined} size="small" color="lilac" /><span>{story.name}</span></div><div className="story-tile-text">{story.text}</div></button>)}</div></div>}

      {tab === 'chats' && <div className="standard-page chat-page"><div className="page-heading"><div className="eyebrow">STAY CLOSE <span className="eyebrow-line" /></div><h1>Your <em>chats.</em></h1><p>Good conversations make everything a little brighter.</p></div><div className="chat-layout"><div className={`chat-list ${activeChat ? 'chat-list-hidden' : ''}`}><div className="search-box"><Search size={19} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></div><div className="chat-list-title">MESSAGES <span>{people.length}</span></div>{people.filter(person => person.name.toLowerCase().includes(search.toLowerCase())).map((person, index) => <button className={`chat-row ${activeChat === person.name ? 'selected' : ''}`} key={person.name} onClick={() => setActiveChat(person.name)}><Avatar name={person.name} image={person.image} color={person.color} /><span className="chat-row-copy"><strong>{person.name}</strong><small>{conversations[person.name]?.at(-1)?.text || 'Start a conversation'}</small></span><span className="chat-row-meta">{index === 0 ? '10:48' : index === 1 ? 'Yesterday' : index === 2 ? 'Tue' : 'Mon'}</span></button>)}</div><div className={`chat-thread ${activeChat ? 'thread-open' : ''}`}>{activeChat ? <><div className="thread-header"><button className="back-button" onClick={() => setActiveChat(null)} aria-label="Back to chats"><ArrowLeft size={20} /></button><Avatar name={activeChat} image={people.find(p => p.name === activeChat)?.image} color="peach" size="small" /><div><strong>{activeChat}</strong><small>Here for the little moments</small></div></div><div className="thread-messages"><div className="day-divider">TODAY</div>{(conversations[activeChat] || []).map((message, index) => <div className={`message-bubble ${message.from === 'me' ? 'mine' : ''}`} key={message.id ?? index}>{message.text}<small>{message.time}</small>{message.from === 'me' && <button className="message-delete" onClick={() => deleteMessage(activeChat, message, index)} aria-label="Delete message"><Trash2 size={13} /></button>}</div>)}</div><form className="message-form" onSubmit={e => { e.preventDefault(); sendMessage() }}><input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Write a message..." aria-label="Write a message" /><button type="submit" aria-label="Send message"><Send size={18} /></button></form></> : <div className="chat-empty"><span><MessageCircle size={28} /></span><h3>Closer, one message at a time.</h3><p>Choose a conversation to catch up with your people.</p></div>}</div></div></div>}

      {tab === 'create' && <div className="standard-page kids-page"><div className="page-heading"><div className="eyebrow">A LITTLE MAGIC, JUST FOR THEM <span className="eyebrow-line" /></div><h1>Kids’ <em>stories.</em></h1><p>Make them the hero of a one-of-a-kind bedtime adventure.</p></div>{generated ? <div className="generated-story"><button className="text-link" onClick={() => setGenerated(null)}><ArrowLeft size={16} /> Back to creator</button><div className="generated-cover"><span><Sparkles size={20} /> A STORY FOR {generated.child.toUpperCase()}</span><h2>{generated.title}</h2><Moon size={35} /></div><div className="story-body">{generated.text.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="generated-actions"><button className="primary-button" onClick={saveKidStory}><Bookmark size={17} /> Save this story</button><button className="secondary-button" onClick={() => { setGenerated(null); setChildName('') }}>Create another</button></div></div> : <><div className="kids-hero"><div className="kids-hero-content"><span className="kids-tag"><Sparkles size={14} /> MADE WITH IMAGINATION</span><h2>Every child deserves to be the hero.</h2><p>Dream up a story you can read together, tonight and for years to come.</p></div><div className="book-art" aria-hidden="true"><div className="art-star star-one">✦</div><div className="art-star star-two">✧</div><div className="art-moon" /><div className="art-book"><div className="book-left" /><div className="book-right" /><div className="book-spine" /></div></div></div><div className="creator-card"><div className="creator-heading"><span className="creator-icon"><WandSparkles size={20} /></span><div><h2>Let’s make a story</h2><p>Just a few details, and the adventure begins.</p></div></div><div className="form-grid"><label>Child’s name<input value={childName} onChange={e => setChildName(e.target.value)} placeholder="e.g. Charlie" /></label><label>Age range<select value={age} onChange={e => setAge(e.target.value)}><option>2–3 years</option><option>4–6 years</option><option>7–9 years</option></select></label><label className="full-field">What should the story be about?<input value={theme} onChange={e => setTheme(e.target.value)} placeholder="A magical adventure" /></label></div><div className="theme-suggestions"><span>TRY AN IDEA</span>{['A friendly dragon', 'Under the sea', 'A journey to the moon'].map(idea => <button className={theme === idea ? 'chosen' : ''} onClick={() => setTheme(idea)} key={idea}>{idea}</button>)}</div><button className="primary-button generate-button" onClick={makeStory} disabled={isGenerating}><Sparkles size={18} /> {isGenerating ? 'Creating their story...' : 'Create their story'} <ArrowRight size={17} /></button><p className="creator-note">A fresh adventure inspired by their name, age, and imagination.</p></div><div className="library-section"><div className="section-row"><div><h2>Your story shelf</h2><p>Every adventure you’ve saved, all in one place.</p></div><span className="library-count">{kidStories.length} STORIES</span></div>{kidStories.length ? <div className="library-list">{kidStories.map((story, index) => <div className="library-item" key={story.id ?? index}><button onClick={() => setGenerated(story)}><span className="library-book"><BookHeart size={23} /></span><span><strong>{story.title}</strong><small>For {story.child} · {story.date}</small></span><ChevronRight size={19} /></button><button className="library-delete" onClick={() => deleteKidStory(story, index)} aria-label={`Delete ${story.title}`}><Trash2 size={18} /></button></div>)}</div> : <div className="empty-library"><BookHeart size={25} /><span>Your next favorite bedtime story starts here.</span></div>}</div></>}</div>}

      {tab === 'profile' && <div className="standard-page profile-page"><div className="page-heading"><div className="eyebrow">A SPACE THAT’S YOURS <span className="eyebrow-line" /></div><h1>Your <em>profile.</em></h1><p>The little things that make you, you.</p></div><div className="profile-card"><div className={`profile-cover ${shown.coverUrl ? 'has-image' : ''}`} style={shown.coverUrl ? { backgroundImage: `url(${shown.coverUrl})` } : undefined}><div className="cover-orbit orbit-one" /><div className="cover-orbit orbit-two" /><span>THE GOOD IN EVERY DAY ✦</span></div><div className="profile-details"><div className="profile-avatar"><Avatar name={shown.name} image={shown.avatarUrl} size="large" color="sage" /></div><button className="edit-profile" onClick={() => { setDraftProfile(profile); setAvatarFile(null); setCoverFile(null); setModal('profile') }}><Pencil size={16} /> Edit profile</button><h2>{profile.name}</h2><div className="profile-handle">@{profile.handle}</div><p>{profile.bio}</p><div className="profile-stats"><div><strong>{posts.filter(p => p.author === profile.name).length}</strong><span>Posts</span></div><div><strong>{dailyStories.filter(s => s.name === profile.name).length}</strong><span>Stories</span></div><div><strong>{kidStories.length}</strong><span>Kids’ tales</span></div></div></div></div><div className="profile-posts"><div className="section-row"><div><h2>Your moments</h2><p>Little pieces of your story.</p></div><button className="text-link" onClick={() => setModal('post')}><Plus size={16} /> New post</button></div>{posts.filter(p => p.author === profile.name).length ? posts.filter(p => p.author === profile.name).map(p => <article className="profile-post" key={p.id}><span className="profile-post-date">{p.time}</span><p>{p.text}</p>{p.image && <img src={p.image} alt="Your shared moment" />}</article>) : <div className="profile-empty"><span><ImagePlus size={25} /></span><h3>Your story starts here.</h3><p>Share your first moment with your circle.</p><button className="secondary-button" onClick={() => setModal('post')}>Share a moment</button></div>}</div><button className="account-link" onClick={() => setModal('account')}><Mail size={18} /> {isMember ? 'Account details' : 'Create your account'} <ChevronRight size={18} /></button><button className="delete-account-link" onClick={() => setModal('delete')}>Delete account</button></div>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="Main navigation">{tabs.map(({ id, label, Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => openTab(id)}><Icon size={22} strokeWidth={tab === id ? 2.5 : 1.9} /><span>{label}</span></button>)}</nav>
    {selectedStory !== null && dailyStories[selectedStory] && <div className="story-viewer" onClick={() => setSelectedStory(null)}><div className="viewer-panel" onClick={e => e.stopPropagation()}>{dailyStories[selectedStory].image && <img src={dailyStories[selectedStory].image} alt="Shared daily story" />}<div className="viewer-shade" /><div className="viewer-progress" /><div className="viewer-header"><Avatar name={dailyStories[selectedStory].name} size="small" color="sage" /><strong>{dailyStories[selectedStory].name}</strong><span>Today</span><div className="viewer-menu-wrap"><button onClick={() => setStoryMenu(open => !open)} aria-label="More story options" aria-expanded={storyMenu}><Ellipsis size={23} /></button>{storyMenu && <div className="post-menu viewer-menu" role="menu">{dailyStories[selectedStory].name === profile.name && <button role="menuitem" className="danger" onClick={() => deleteStory(selectedStory)}><Trash2 size={16} /> Delete Story</button>}<button role="menuitem" onClick={() => shareStory(selectedStory)}><Share2 size={16} /> Share</button></div>}</div><button onClick={() => { setStoryMenu(false); setSelectedStory(null) }} aria-label="Close story"><X size={23} /></button></div><div className="viewer-content">{dailyStories[selectedStory].text}</div><button className="viewer-prev" onClick={() => { setStoryMenu(false); setSelectedStory((selectedStory - 1 + dailyStories.length) % dailyStories.length) }} aria-label="Previous story"><ChevronLeft size={24} /></button><button className="viewer-next" onClick={() => setSelectedStory((selectedStory + 1) % dailyStories.length)} aria-label="Next story"><ChevronRight size={24} /></button></div></div>}
    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="modal-panel"><div className="modal-top"><h2>{modal === 'post' ? 'Share a moment' : modal === 'story' ? 'Add to your story' : modal === 'profile' ? 'Edit profile' : modal === 'notifications' ? 'Notifications' : modal === 'delete' ? 'Delete account' : isMember ? 'Your account' : 'Join MingleNest'}</h2><button onClick={() => setModal(null)} aria-label="Close"><X size={21} /></button></div>{modal === 'post' && <div className="modal-content"><div className="modal-person"><Avatar name={profile.name} color="sage" size="small" /><span><strong>{profile.name}</strong><small>Sharing with your circle</small></span></div><textarea autoFocus value={postText} onChange={e => setPostText(e.target.value)} placeholder="What’s a little moment you’d like to share?" rows={5} /><label className={`story-picker ${postImage ? 'has-image' : ''}`} style={postImage ? { backgroundImage: `url(${postImage})` } : undefined}><input type="file" accept="image/*" onChange={pickPostImage} aria-label="Choose a photo" /><span className="media-badge"><ImagePlus size={15} /> {postImage ? 'Change photo' : 'Add a photo'}</span></label><button className="primary-button modal-submit" onClick={publishPost} disabled={!postText.trim() || savingPost}>{savingPost ? 'Sharing...' : 'Share moment'} <ArrowRight size={17} /></button></div>}{modal === 'story' && <div className="modal-content"><p className="modal-description">A small glimpse into your day, shared with your people.</p><textarea autoFocus value={storyText} onChange={e => setStoryText(e.target.value)} placeholder="What’s happening today?" rows={4} /><label className={`story-picker ${storyImage ? 'has-image' : ''}`} style={storyImage ? { backgroundImage: `url(${storyImage})` } : undefined}><input type="file" accept="image/*" onChange={pickStoryImage} aria-label="Choose a story photo" /><span className="media-badge"><ImagePlus size={15} /> {storyImage ? 'Change photo' : 'Choose a photo'}</span></label><button className="primary-button modal-submit" onClick={publishStory} disabled={(!storyText.trim() && !storyFile) || savingStory}>{savingStory ? 'Sharing...' : 'Share story'} <ArrowRight size={17} /></button></div>}{modal === 'profile' && <div className="modal-content profile-form"><div className="media-edit"><label className={`cover-edit ${draftProfile.coverUrl ? 'has-image' : ''}`} style={draftProfile.coverUrl ? { backgroundImage: `url(${draftProfile.coverUrl})` } : undefined}><input type="file" accept="image/*" onChange={e => pickImage(e, 'cover')} aria-label="Choose cover photo" /><span className="media-badge"><Camera size={15} /> {draftProfile.coverUrl ? 'Change cover' : 'Add cover photo'}</span></label><label className="avatar-edit"><input type="file" accept="image/*" onChange={e => pickImage(e, 'avatar')} aria-label="Choose profile picture" /><Avatar name={draftProfile.name || '?'} image={draftProfile.avatarUrl} size="large" color="sage" /><span className="avatar-camera"><Camera size={14} /></span></label></div><label className="input-label">Your name<input value={draftProfile.name} onChange={e => setDraftProfile({ ...draftProfile, name: e.target.value })} /></label><label className="input-label">Username<input value={draftProfile.handle} onChange={e => setDraftProfile({ ...draftProfile, handle: e.target.value.replace(/\s/g, '').toLowerCase() })} /></label><label className="input-label">A little about you<textarea rows={3} value={draftProfile.bio} onChange={e => setDraftProfile({ ...draftProfile, bio: e.target.value })} /></label><button className="primary-button modal-submit" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save changes'} <Check size={17} /></button></div>}{modal === 'notifications' && <div className="modal-content notification-content"><div className="notification-icon"><Bell size={23} /></div><h3>All caught up.</h3><p>When your people share something new, you’ll find it here.</p></div>}{modal === 'delete' && <div className="modal-content delete-content"><h3>Delete your MingleNest account?</h3><p>Deleting your account removes your profile, posts, stories and saved Kids’ stories. You’ll be taken to a short request form to confirm your details. Nothing is deleted until the request is processed.</p><button className="primary-button danger-button modal-submit" onClick={() => { window.open('https://docs.google.com/forms/d/e/1FAIpQLSet39JW9olvDYwSEqF9C6Vyx8obVpNaUU9Ahsqxbm--jOC62g/viewform?usp=dialog', '_blank', 'noopener,noreferrer'); setModal(null) }}>Request Account Deletion</button><button className="secondary-button modal-submit" onClick={() => setModal(null)}>Keep my account</button></div>}{modal === 'account' && <div className="modal-content">{isMember ? <div className="account-success"><span><Check size={25} /></span><h3>You’re part of the nest.</h3><p>Your first-version account is saved on this device. Connect Supabase to access it across devices and chat with real people.</p><button className="secondary-button" onClick={() => { setIsMember(false); setModal(null); setToast('Signed out of this device') }}>Sign out</button></div> : <><p className="modal-description">A cozy space for your people, your moments, and your stories.</p><div className="account-switch"><button className={accountMode === 'join' ? 'active' : ''} onClick={() => setAccountMode('join')}>Create account</button><button className={accountMode === 'login' ? 'active' : ''} onClick={() => setAccountMode('login')}>Sign in</button></div><form className="account-form" onSubmit={submitAccount}>{accountMode === 'join' && <label className="input-label">Your name<input required value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Alex Morgan" /></label>}<label className="input-label">Email address<input type="email" required value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="you@example.com" /></label><label className="input-label">Password<input type="password" required minLength={6} value={accountPassword} onChange={e => setAccountPassword(e.target.value)} placeholder="At least 6 characters" /></label><button className="primary-button modal-submit" type="submit">{accountMode === 'join' ? 'Join the nest' : 'Sign in'} <ArrowRight size={17} /></button></form><p className="local-note">For this first version, account details stay on this device.</p></>}</div>}</div></div>}
    {toast && <div className="toast"><Check size={17} />{toast}</div>}
  </div>
}

export default App
