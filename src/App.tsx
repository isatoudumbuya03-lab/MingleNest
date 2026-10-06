import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bell, BookHeart, Bookmark, Camera, Check, ChevronLeft, ChevronRight, CirclePlus, Ellipsis, Heart, Home, ImagePlus, Mail, MessageCircle, Moon, Pencil, Plus, Search, Send, Mic, Square, Play, Pause, Settings2, Share2, Sparkles, Trash2, Flag, WandSparkles, X } from 'lucide-react'
import { generateKidsStory } from './kidsStory'
import { getPrivateConversation, listChatContacts, readPrivateMessages, removePrivateMessage, sendPrivateText, sendPrivateVoice, type ChatContact, type PrivateMessage } from './privateChat'
import { confirmationRedirect, listenForAuthCallback } from './authCallback'
import type { User } from '@supabase/supabase-js'
import VoicePlayer, { voiceTime } from './VoicePlayer'
import { supabase, PROFILE_BUCKET, deviceId, resizeImage, blobToDataUrl } from './supabase'

type Profile = { name: string; handle: string; bio: string; avatarUrl?: string; coverUrl?: string }

type Tab = 'home' | 'stories' | 'create' | 'chats' | 'profile'
type Post = { id: number; cloudId?: string; ownerId?: string; author: string; handle: string; avatar: string; time: string; text: string; image?: string; likes: number; comments: number; liked?: boolean; saved?: boolean }
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
  const [activeContactId, setActiveContactId] = useState<string | null>(null)
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
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([])
  const [chatBusy, setChatBusy] = useState(false)
  const [accountBusy, setAccountBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingMs, setRecordingMs] = useState(0)
  const [voiceDraft, setVoiceDraft] = useState<{ blob: Blob; durationMs: number } | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startedRef = useRef(0)
  const discardRef = useRef(false)
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Signed-in profiles are loaded from Supabase, not shared device-wide local storage.
  useEffect(() => { if (authReady && !authUser) localStorage.setItem('mn-posts', JSON.stringify(posts)) }, [posts, authReady, authUser])
  useEffect(() => { if (authReady && !authUser) localStorage.setItem('mn-daily', JSON.stringify(dailyStories)) }, [dailyStories, authReady, authUser])
  useEffect(() => { if (authReady && !authUser) localStorage.setItem('mn-kids', JSON.stringify(kidStories)) }, [kidStories, authReady, authUser])
  useEffect(() => { localStorage.setItem('mn-chats', JSON.stringify(conversations)) }, [conversations])
  useEffect(() => {
    let live = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!live) return
      if (error) setToast(error.message)
      setAuthUser(data.session?.user ?? null); setAuthReady(true)
    }).catch(() => { if (live) setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (live) { setAuthUser(session?.user ?? null); setAuthReady(true) }
    })
    const stopLink = listenForAuthCallback(() => { void supabase.auth.getSession().then(({ data }) => { if (data.session) { setAuthUser(data.session.user); setModal(null); setToast('Email confirmed. Welcome to MingleNest!') } else { setToast('Email confirmed. Sign in to continue.'); setAccountMode('login'); setModal('account') } }) }, setToast)
    return () => { live = false; listener.subscription.unsubscribe(); stopLink() }
  }, [])
  useEffect(() => {
    if (!authReady) return
    if (!authUser) { setIsMember(false); setProfile(readStore<Profile>('mn-profile', { name: 'Alex Morgan', handle: 'alexmorgan', bio: '' })); setPosts(readStore('mn-posts', initialPosts)); setDailyStories(readStore('mn-daily', [{ name: 'Maya Chen', text: 'An afternoon worth remembering ☀️', image: photos.friends }, { name: 'Olivia Park', text: 'A little joy in the everyday.', image: photos.portrait }, { name: 'Leo Martin', text: 'Out here making memories.', image: photos.picnic }])); setKidStories(readStore('mn-kids', [])); return }
    let live = true
    setIsMember(true)
    const name = String(authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Member')
    const initial = { name, handle: name.toLowerCase().replace(/\s+/g, ''), bio: '', avatarUrl: '', coverUrl: '' }
    setProfile(initial); setDraftProfile(initial)
    supabase.from('profiles').select('full_name,username,handle,bio,avatar_url,cover_url').eq('id', authUser.id).maybeSingle().then(({ data }) => {
      if (!live || !data) return
      const next = { name: data.full_name || String(authUser.user_metadata?.display_name || 'Member'), handle: data.handle || data.username || '', bio: data.bio || '', avatarUrl: data.avatar_url || '', coverUrl: data.cover_url || '' }
      setProfile(next); setDraftProfile(next)
    })
    return () => { live = false }
  }, [authUser?.id, authReady])
  useEffect(() => {
    if (!authUser) return
    let live = true
    const load = async () => {
      const [postResult, storyResult, profileResult, likeResult, commentResult, kidResult] = await Promise.all([
        supabase.from('posts').select('id,user_id,content,image_url,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('stories').select('id,user_id,caption,media_url').order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('id,full_name,username'),
        supabase.from('post_reactions').select('post_id,user_id'),
        supabase.from('post_comments').select('id,post_id,user_id,content,created_at').order('created_at'),
        supabase.from('kids_stories').select('id,title,content').eq('user_id', authUser.id).order('created_at', { ascending: false }),
      ])
      if (!live) return
      const names = new Map((profileResult.data || []).map(person => [person.id, person]))
      if (!postResult.error) setPosts([...((postResult.data || []).map(item => {
        const owner = names.get(item.user_id)
        const likes = (likeResult.data || []).filter(like => like.post_id === item.id)
        return { id: parseInt(item.id.replace(/-/g, '').slice(0, 12), 16), cloudId: item.id, ownerId: item.user_id, author: owner?.full_name || 'Member', handle: owner?.username || 'member', avatar: (owner?.full_name || 'M')[0], time: new Date(item.created_at).toLocaleDateString(), text: item.content || '', image: item.image_url || undefined, likes: likes.length, comments: (commentResult.data || []).filter(comment => comment.post_id === item.id).length, liked: likes.some(like => like.user_id === authUser.id) } as Post
      })), ...initialPosts])
      if (!storyResult.error) setDailyStories([...(storyResult.data || []).map(item => ({ id: item.id, ownerId: item.user_id, name: names.get(item.user_id)?.full_name || 'Member', text: item.caption || '', image: item.media_url || undefined })), { name: 'Maya Chen', text: 'An afternoon worth remembering ☀️', image: photos.friends }, { name: 'Olivia Park', text: 'A little joy in the everyday.', image: photos.portrait }, { name: 'Leo Martin', text: 'Out here making memories.', image: photos.picnic }])
      if (!commentResult.error) {
        const mapped: Record<number, string[]> = {}
        for (const item of commentResult.data || []) { const key = parseInt(item.post_id.replace(/-/g, '').slice(0, 12), 16); (mapped[key] ||= []).push(item.content) }
        setComments(mapped)
      }
      if (!kidResult.error) setKidStories((kidResult.data || []).map(item => {
        try { return { ...JSON.parse(item.content || '{}'), id: item.id } as KidStory }
        catch { return { id: item.id, title: item.title || 'A little story', text: item.content || '', child: '', theme: '', date: '' } }
      }))
    }
    void load()
    return () => { live = false }
  }, [authUser?.id])
  useEffect(() => {
    if (!authUser) { setContacts([]); setChatId(null); setPrivateMessages([]); return }
    const refresh = () => listChatContacts(authUser.id).then(setContacts).catch(() => setToast('Could not load chat contacts'))
    refresh()
    const channel = supabase.channel('chat-user-directory').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_users' }, refresh).subscribe()
    window.addEventListener('focus', refresh)
    return () => { supabase.removeChannel(channel); window.removeEventListener('focus', refresh) }
  }, [authUser])
  useEffect(() => {
    if (!authUser || tab !== 'chats' || !activeContactId) { setChatId(null); setPrivateMessages([]); return }
    const contact = contacts.find(person => person.id === activeContactId)
    if (!contact) { setChatId(null); setPrivateMessages([]); return }
    let cancelled = false
    setChatId(null); setPrivateMessages([])
    getPrivateConversation(contact.id).then(async id => {
      if (cancelled) return
      setChatId(id)
      const messages = await readPrivateMessages(id)
      if (!cancelled) setPrivateMessages(messages)
    }).catch(() => { if (!cancelled) setToast('Could not open this conversation') })
    return () => { cancelled = true }
  }, [authUser?.id, tab, activeContactId, contacts])
  useEffect(() => {
    if (!chatId) return
    const refresh = () => readPrivateMessages(chatId).then(setPrivateMessages).catch(() => {})
    const channel = supabase.channel(`chat:${chatId}`, { config: { private: true } })
      .on('broadcast', { event: 'message-deleted' }, payload => {
        // A member may announce a deletion, but only the database decides what
        // actually disappeared. Never trust a broadcast ID as proof of deletion.
        if ((payload.payload as { id?: string }).id) void refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${chatId}` }, refresh).subscribe()
    chatChannelRef.current = channel
    const onFocus = () => refresh()
    const interval = window.setInterval(refresh, 12000)
    window.addEventListener('focus', onFocus)
    return () => { if (chatChannelRef.current === channel) chatChannelRef.current = null; supabase.removeChannel(channel); window.clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [chatId])
  useEffect(() => {
    if (!recording) return
    const interval = window.setInterval(() => setRecordingMs(Date.now() - startedRef.current), 200)
    return () => window.clearInterval(interval)
  }, [recording])
  useEffect(() => () => { discardRef.current = true; if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); streamRef.current?.getTracks().forEach(track => track.stop()) }, [])
  useEffect(() => { if (authReady) localStorage.setItem('mn-member', JSON.stringify(!!authUser)) }, [authReady, authUser?.id])
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
        const path = `${authUser?.id || deviceId}/${kind}-${Date.now()}.jpg`
        const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
        return supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl
      } catch { cloud = false; return blobToDataUrl(blob) }
    }
    const next: Profile = { ...draftProfile }
    if (avatarFile) next.avatarUrl = await upload(avatarFile, 'avatar')
    if (coverFile) next.coverUrl = await upload(coverFile, 'cover')
    try {
      if (!authUser) throw new Error('Sign in to sync your profile')
      const { error } = await supabase.from('profiles').upsert({ id: authUser.id, full_name: next.name, username: next.handle, handle: next.handle, bio: next.bio, avatar_url: next.avatarUrl?.startsWith('data:') ? null : next.avatarUrl ?? null, cover_url: next.coverUrl?.startsWith('data:') ? null : next.coverUrl ?? null, updated_at: new Date().toISOString() })
      if (!error) await supabase.from('chat_users').update({ display_name: next.name }).eq('id', authUser.id)
      if (error) throw error
    } catch { cloud = false }
    setProfile(next); setAvatarFile(null); setCoverFile(null); setSavingProfile(false); setModal(null)
    setToast(cloud ? 'Profile updated' : 'Profile saved on this device — cloud storage isn’t reachable yet')
  }
  const openTab = (next: Tab) => { if (recording) stopRecording(true); setVoiceDraft(null); setTab(next); setActiveChat(null); setActiveContactId(null); setGenerated(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openChat = (name: string, id: string | null) => { if (!id) { setToast('This person has not joined chat yet'); return } if (recording) stopRecording(true); setVoiceDraft(null); setActiveChat(name); setActiveContactId(id); setTab('chats') }
  const toggleLike = async (id: number) => {
    const post = posts.find(item => item.id === id)
    if (!post) return
    if (post.cloudId && !authUser) { setToast('Sign in to like posts'); return }
    if (post.cloudId && authUser) {
      const request = post.liked ? supabase.from('post_reactions').delete().eq('post_id', post.cloudId).eq('user_id', authUser.id) : supabase.from('post_reactions').insert({ post_id: post.cloudId, user_id: authUser.id })
      const { error } = await request
      if (error) { setToast('Could not update your reaction'); return }
    }
    setPosts(items => items.map(item => item.id === id ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item))
  }
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
        const path = `${authUser?.id || deviceId}/post-${Date.now()}.jpg`
        const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, postFile, { contentType: 'image/jpeg' })
        if (error) throw error
        imageUrl = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl
      } catch (error) { console.warn('Post upload failed', error); cloud = false; imageUrl = await blobToDataUrl(postFile) }
    }
    let cloudId: string | undefined
    try {
      if (!authUser) throw new Error('Sign in to share across devices')
      const { data, error } = await supabase.from('posts').insert({ user_id: authUser.id, content: text, image_url: imageUrl?.startsWith('data:') ? null : imageUrl ?? null }).select('id').single()
      if (error) throw error
      cloudId = data.id
    } catch (error) { console.warn('Post insert failed', error); cloud = false }
    setPosts(items => [{ id: cloudId ? parseInt(cloudId.replace(/-/g, '').slice(0, 12), 16) : Date.now(), cloudId, ownerId: authUser?.id, author: profile.name, handle: profile.handle, avatar: profile.name.charAt(0), time: 'Just now', text, image: imageUrl, likes: 0, comments: 0 }, ...items])
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
  const canDeletePost = (post: Post) => post.cloudId ? post.ownerId === authUser?.id : post.author === profile.name
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
        const path = `${authUser?.id || deviceId}/story-${Date.now()}.jpg`
        const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, storyFile, { contentType: 'image/jpeg' })
        if (error) throw error
        mediaUrl = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl
      } catch (error) { console.warn('Story upload failed', error); cloud = false; mediaUrl = await blobToDataUrl(storyFile) }
    }
    let storyId: string | number | undefined
    if (cloud) {
      try {
        const { data, error } = await supabase.from('stories').insert({ user_id: authUser?.id || deviceId, media_url: mediaUrl ?? null, caption }).select('id').single()
        if (error) throw error
        storyId = data?.id
      } catch (error) { console.warn('Story insert failed', error); cloud = false }
    }
    setDailyStories(items => [{ id: storyId, ownerId: authUser?.id, name: profile.name, text: caption, image: mediaUrl }, ...items])
    setStoryText(''); setStoryImage(''); setStoryFile(null); setSavingStory(false); setModal(null)
    setToast(cloud ? 'Story shared with your circle' : 'Story added here, but it could not be saved to the cloud')
  }
  const deletePrivateMessage = async (message: PrivateMessage) => {
    if (!authUser) return
    try {
      await removePrivateMessage(message, authUser.id)
      setPrivateMessages(items => items.filter(item => item.id !== message.id))
      // Broadcast the ID as well as using Postgres changes: RLS can suppress
      // DELETE payloads once their row no longer exists.
      if (chatChannelRef.current) void chatChannelRef.current.send({ type: 'broadcast', event: 'message-deleted', payload: { id: message.id } })
      setDeletingMessageId(null)
    } catch (error) {
      // The row may already be gone even if Storage removal failed; reload the
      // authoritative conversation instead of leaving a deleted bubble on screen.
      if (chatId) void readPrivateMessages(chatId).then(setPrivateMessages).catch(() => {})
      setToast(error instanceof Error ? error.message : 'Could not delete message'); setDeletingMessageId(null)
    }
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
    const post = posts.find(item => item.id === id)
    if (!post || !canDeletePost(post)) return
    setMenuPost(null)
    if (post.cloudId) {
      const { data, error } = await supabase.from('posts').delete().eq('id', post.cloudId).eq('user_id', authUser!.id).select('id')
      if (error || !data?.length) { setToast('Could not delete post'); return }
    }
    setPosts(items => items.filter(item => item.id !== id))
    setToast('Post deleted')
  }
  const sendMessage = async () => {
    if (!activeChat || !chatInput.trim()) return
    if (!authUser || !chatId) { setToast('Sign in and choose a real contact to send messages'); return }
    const text = chatInput.trim().normalize('NFC'); setChatBusy(true)
    try { const message = await sendPrivateText(chatId, authUser.id, text); setPrivateMessages(prev => prev.some(item => item.id === message.id) ? prev : [...prev, message]); setChatInput('') }
    catch (error) { setToast(error instanceof Error ? error.message : 'Message could not be sent') }
    finally { setChatBusy(false) }
  }
  const startRecording = async () => {
    if (!authUser || !chatId) { setToast('Sign in and choose a real contact to record'); return }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setToast('Microphone recording is not available on this device'); return }
    try {
      setVoiceDraft(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type))
      if (!mimeType) { stream.getTracks().forEach(track => track.stop()); throw new Error('Audio format is not supported on this device') }
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: BlobPart[] = []
      recorderRef.current = recorder
      discardRef.current = false
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        setRecording(false)
        if (discardRef.current) return
        const durationMs = Date.now() - startedRef.current
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/mp4' })
        if (blob.size && durationMs > 0) setVoiceDraft({ blob, durationMs })
        else setToast('Recording was empty; please try again')
      }
      recorder.onerror = () => { stream.getTracks().forEach(track => track.stop()); streamRef.current = null; setRecording(false); setToast('Recording failed') }
      recorder.start(250)
      startedRef.current = Date.now(); setRecordingMs(0); setRecording(true)
    } catch (error) { setToast(error instanceof Error && error.message.startsWith('Audio format') ? error.message : 'Microphone permission is needed to record a voice message') }
  }
  const stopRecording = (cancel = false) => {
    if (recorderRef.current?.state === 'recording') { discardRef.current = cancel; recorderRef.current.stop() }
    if (cancel) { setVoiceDraft(null); setRecordingMs(0) }
  }
  const sendRecording = async () => {
    if (!authUser || !chatId || !voiceDraft || chatBusy) return
    setChatBusy(true)
    try {
      const message = await sendPrivateVoice(chatId, authUser.id, voiceDraft.blob, voiceDraft.durationMs)
      setPrivateMessages(prev => prev.some(item => item.id === message.id) ? prev : [...prev, message]); setVoiceDraft(null)
    } catch (error) { setToast(error instanceof Error ? error.message : 'Voice message could not be sent') }
    finally { setChatBusy(false) }
  }
  const addComment = async (id: number) => {
    if (!commentText.trim()) return
    const post = posts.find(item => item.id === id)
    if (post?.cloudId && !authUser) { setToast('Sign in to comment'); return }
    const text = commentText.trim().normalize('NFC')
    if (post?.cloudId && authUser) {
      const { error } = await supabase.from('post_comments').insert({ post_id: post.cloudId, user_id: authUser.id, content: text })
      if (error) { setToast('Could not add your comment'); return }
    }
    setComments(current => ({ ...current, [id]: [...(current[id] || []), text] }))
    setPosts(items => items.map(item => item.id === id ? { ...item, comments: item.comments + 1 } : item)); setCommentText('')
  }
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
  const submitAccount = async (event: React.FormEvent) => {
    event.preventDefault()
    if (accountBusy) return
    setAccountBusy(true)
    try {
      if (accountMode === 'join') {
        const { data, error } = await supabase.auth.signUp({ email: accountEmail.trim(), password: accountPassword, options: { data: { display_name: accountName.trim() }, emailRedirectTo: confirmationRedirect() } })
        if (error) throw error
        if (!data.user) throw new Error('Could not create your account')
        setProfile(current => ({ ...current, name: accountName.trim(), handle: accountName.trim().toLowerCase().replace(/\s+/g, '') }))
        if (data.session) { setIsMember(true); setModal(null) }
        setToast(data.session ? 'Welcome to the nest!' : 'Check your email to confirm your account, then sign in')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: accountEmail.trim(), password: accountPassword })
        if (error) throw error
        setAuthUser(data.user)
        setIsMember(true); setModal(null); setToast('Welcome back!')
      }
      setAccountPassword('')
    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not sign in') }
    finally { setAccountBusy(false) }
  }

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
        </div><aside className="home-side"><div className="welcome-card"><div className="welcome-icon"><Heart size={20} fill="currentColor" /></div><h3>A place to feel at home.</h3><p>Share the ordinary, celebrate the extraordinary, and stay close to your people.</p><span>GOOD THINGS GROW TOGETHER</span></div><div className="side-section"><div className="section-row"><h3>Your people</h3><button onClick={() => openTab('chats')} className="text-link">View chats <ArrowRight size={14} /></button></div>{people.slice(0, 3).map(person => <button className="person-row" key={person.name} onClick={() => openChat(person.name, contacts.find(contact => contact.name === person.name)?.id ?? null)}><Avatar name={person.name} image={person.image} color={person.color} size="small" /><span><strong>{person.name}</strong><small>Say hello</small></span><MessageCircle size={17} /></button>)}</div></aside></div>
      </>}

      {tab === 'stories' && <div className="standard-page"><div className="page-heading"><div className="eyebrow">LIFE, AS IT HAPPENS <span className="eyebrow-line" /></div><h1>Daily <em>stories.</em></h1><p>A little window into the moments your people are making.</p></div><button className="primary-button story-create" onClick={() => setModal('story')}><Plus size={18} /> Add to your story</button><div className="story-grid">{dailyStories.map((story, index) => <button className={`story-tile story-tile-${index % 4}`} key={`${story.name}-${index}`} onClick={() => setSelectedStory(index)}>{story.image && <img src={story.image} alt="" />}<div className="story-tile-shade" /><div className="story-tile-top"><Avatar name={story.name} image={story.name === 'Olivia Park' ? photos.portrait : undefined} size="small" color="lilac" /><span>{story.name}</span></div><div className="story-tile-text">{story.text}</div></button>)}</div></div>}

      {tab === 'chats' && <div className="standard-page chat-page"><div className="page-heading"><div className="eyebrow">STAY CLOSE <span className="eyebrow-line" /></div><h1>Your <em>chats.</em></h1><p>Good conversations make everything a little brighter.</p></div>{!authUser && <button className="secondary-button" onClick={() => { setAccountMode('login'); setModal('account') }}>Sign in to chat with your people</button>}<div className="chat-layout"><div className={`chat-list ${activeChat ? 'chat-list-hidden' : ''}`}><div className="search-box"><Search size={19} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></div><div className="chat-list-title">MESSAGES <span>{contacts.length}</span></div>{contacts.filter(person => person.name.toLowerCase().includes(search.toLowerCase())).map(person => <button className={`chat-row ${activeContactId === person.id ? 'selected' : ''}`} key={person.id} onClick={() => openChat(person.name, person.id)}><Avatar name={person.name} color="peach" /><span className="chat-row-copy"><strong>{person.name}</strong><small>Open conversation</small></span></button>)}{authUser && !contacts.length && <p className="chat-contact-empty">Your people will appear here when they join MingleNest.</p>}</div><div className={`chat-thread ${activeChat ? 'thread-open' : ''}`}>{activeChat ? <><div className="thread-header"><button className="back-button" onClick={() => { if (recording) stopRecording(true); setVoiceDraft(null); setActiveChat(null); setActiveContactId(null) }} aria-label="Back to chats"><ArrowLeft size={20} /></button><Avatar name={activeChat} color="peach" size="small" /><div><strong>{activeChat}</strong><small>Here for the little moments</small></div></div><div className="thread-messages"><div className="day-divider">TODAY</div>{privateMessages.map(message => <div className={`message-bubble ${message.sender_user_id === authUser?.id ? 'mine' : ''}`} key={message.id}>{message.message_type === 'voice' && message.audio_path ? <VoicePlayer path={message.audio_path} durationMs={message.duration_ms || 0} /> : message.content}<small>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>{message.sender_user_id === authUser?.id && <button className="message-delete" onClick={() => setDeletingMessageId(message.id)} aria-label="Delete message"><Trash2 size={13} /></button>}</div>)}</div>{recording || voiceDraft ? <div className="message-form voice-composer"><span className="voice-status">{recording ? 'Recording' : 'Voice message'} · {voiceTime(recording ? recordingMs : voiceDraft?.durationMs || 0)}</span>{recording ? <button type="button" onClick={() => stopRecording()} aria-label="Stop recording"><Square size={18} /></button> : <button type="button" onClick={sendRecording} disabled={chatBusy} aria-label="Send voice message"><Send size={18} /></button>}<button type="button" onClick={() => stopRecording(true)} aria-label="Cancel voice message"><X size={18} /></button></div> : <form className="message-form" onSubmit={e => { e.preventDefault(); sendMessage() }}><input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Write a message..." aria-label="Write a message" disabled={!chatId || chatBusy} /><button type="button" onClick={startRecording} disabled={!chatId || chatBusy} aria-label="Record voice message"><Mic size={18} /></button><button type="submit" disabled={!chatId || chatBusy} aria-label="Send message"><Send size={18} /></button></form>}</> : <div className="chat-empty"><span><MessageCircle size={28} /></span><h3>Closer, one message at a time.</h3><p>Choose a conversation to catch up with your people.</p></div>}</div></div></div>}

      {tab === 'create' && <div className="standard-page kids-page"><div className="page-heading"><div className="eyebrow">A LITTLE MAGIC, JUST FOR THEM <span className="eyebrow-line" /></div><h1>Kids’ <em>stories.</em></h1><p>Make them the hero of a one-of-a-kind bedtime adventure.</p></div>{generated ? <div className="generated-story"><button className="text-link" onClick={() => setGenerated(null)}><ArrowLeft size={16} /> Back to creator</button><div className="generated-cover"><span><Sparkles size={20} /> A STORY FOR {generated.child.toUpperCase()}</span><h2>{generated.title}</h2><Moon size={35} /></div><div className="story-body">{generated.text.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="generated-actions"><button className="primary-button" onClick={saveKidStory}><Bookmark size={17} /> Save this story</button><button className="secondary-button" onClick={() => { setGenerated(null); setChildName('') }}>Create another</button></div></div> : <><div className="kids-hero"><div className="kids-hero-content"><span className="kids-tag"><Sparkles size={14} /> MADE WITH IMAGINATION</span><h2>Every child deserves to be the hero.</h2><p>Dream up a story you can read together, tonight and for years to come.</p></div><div className="book-art" aria-hidden="true"><div className="art-star star-one">✦</div><div className="art-star star-two">✧</div><div className="art-moon" /><div className="art-book"><div className="book-left" /><div className="book-right" /><div className="book-spine" /></div></div></div><div className="creator-card"><div className="creator-heading"><span className="creator-icon"><WandSparkles size={20} /></span><div><h2>Let’s make a story</h2><p>Just a few details, and the adventure begins.</p></div></div><div className="form-grid"><label>Child’s name<input value={childName} onChange={e => setChildName(e.target.value)} placeholder="e.g. Charlie" /></label><label>Age range<select value={age} onChange={e => setAge(e.target.value)}><option>2–3 years</option><option>4–6 years</option><option>7–9 years</option></select></label><label className="full-field">What should the story be about?<input value={theme} onChange={e => setTheme(e.target.value)} placeholder="A magical adventure" /></label></div><div className="theme-suggestions"><span>TRY AN IDEA</span>{['A friendly dragon', 'Under the sea', 'A journey to the moon'].map(idea => <button className={theme === idea ? 'chosen' : ''} onClick={() => setTheme(idea)} key={idea}>{idea}</button>)}</div><button className="primary-button generate-button" onClick={makeStory} disabled={isGenerating}><Sparkles size={18} /> {isGenerating ? 'Creating their story...' : 'Create their story'} <ArrowRight size={17} /></button><p className="creator-note">A fresh adventure inspired by their name, age, and imagination.</p></div><div className="library-section"><div className="section-row"><div><h2>Your story shelf</h2><p>Every adventure you’ve saved, all in one place.</p></div><span className="library-count">{kidStories.length} STORIES</span></div>{kidStories.length ? <div className="library-list">{kidStories.map((story, index) => <div className="library-item" key={story.id ?? index}><button onClick={() => setGenerated(story)}><span className="library-book"><BookHeart size={23} /></span><span><strong>{story.title}</strong><small>For {story.child} · {story.date}</small></span><ChevronRight size={19} /></button><button className="library-delete" onClick={() => deleteKidStory(story, index)} aria-label={`Delete ${story.title}`}><Trash2 size={18} /></button></div>)}</div> : <div className="empty-library"><BookHeart size={25} /><span>Your next favorite bedtime story starts here.</span></div>}</div></>}</div>}

      {tab === 'profile' && <div className="standard-page profile-page"><div className="page-heading"><div className="eyebrow">A SPACE THAT’S YOURS <span className="eyebrow-line" /></div><h1>Your <em>profile.</em></h1><p>The little things that make you, you.</p></div><div className="profile-card"><div className={`profile-cover ${shown.coverUrl ? 'has-image' : ''}`} style={shown.coverUrl ? { backgroundImage: `url(${shown.coverUrl})` } : undefined}><div className="cover-orbit orbit-one" /><div className="cover-orbit orbit-two" /><span>THE GOOD IN EVERY DAY ✦</span></div><div className="profile-details"><div className="profile-avatar"><Avatar name={shown.name} image={shown.avatarUrl} size="large" color="sage" /></div><button className="edit-profile" onClick={() => { setDraftProfile(profile); setAvatarFile(null); setCoverFile(null); setModal('profile') }}><Pencil size={16} /> Edit profile</button><h2>{profile.name}</h2><div className="profile-handle">@{profile.handle}</div><p>{profile.bio}</p><div className="profile-stats"><div><strong>{posts.filter(p => p.author === profile.name).length}</strong><span>Posts</span></div><div><strong>{dailyStories.filter(s => s.name === profile.name).length}</strong><span>Stories</span></div><div><strong>{kidStories.length}</strong><span>Kids’ tales</span></div></div></div></div><div className="profile-posts"><div className="section-row"><div><h2>Your moments</h2><p>Little pieces of your story.</p></div><button className="text-link" onClick={() => setModal('post')}><Plus size={16} /> New post</button></div>{posts.filter(p => p.author === profile.name).length ? posts.filter(p => p.author === profile.name).map(p => <article className="profile-post" key={p.id}><span className="profile-post-date">{p.time}</span><p>{p.text}</p>{p.image && <img src={p.image} alt="Your shared moment" />}</article>) : <div className="profile-empty"><span><ImagePlus size={25} /></span><h3>Your story starts here.</h3><p>Share your first moment with your circle.</p><button className="secondary-button" onClick={() => setModal('post')}>Share a moment</button></div>}</div><button className="account-link" onClick={() => setModal('account')}><Mail size={18} /> {isMember ? 'Account details' : 'Create your account'} <ChevronRight size={18} /></button><button className="delete-account-link" onClick={() => setModal('delete')}>Delete account</button></div>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="Main navigation">{tabs.map(({ id, label, Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => openTab(id)}><Icon size={22} strokeWidth={tab === id ? 2.5 : 1.9} /><span>{label}</span></button>)}</nav>
    {selectedStory !== null && dailyStories[selectedStory] && <div className="story-viewer" onClick={() => setSelectedStory(null)}><div className="viewer-panel" onClick={e => e.stopPropagation()}>{dailyStories[selectedStory].image && <img src={dailyStories[selectedStory].image} alt="Shared daily story" />}<div className="viewer-shade" /><div className="viewer-progress" /><div className="viewer-header"><Avatar name={dailyStories[selectedStory].name} size="small" color="sage" /><strong>{dailyStories[selectedStory].name}</strong><span>Today</span><div className="viewer-menu-wrap"><button onClick={() => setStoryMenu(open => !open)} aria-label="More story options" aria-expanded={storyMenu}><Ellipsis size={23} /></button>{storyMenu && <div className="post-menu viewer-menu" role="menu">{(dailyStories[selectedStory].ownerId ? dailyStories[selectedStory].ownerId === authUser?.id : dailyStories[selectedStory].name === profile.name) && <button role="menuitem" className="danger" onClick={() => deleteStory(selectedStory)}><Trash2 size={16} /> Delete Story</button>}<button role="menuitem" onClick={() => shareStory(selectedStory)}><Share2 size={16} /> Share</button></div>}</div><button onClick={() => { setStoryMenu(false); setSelectedStory(null) }} aria-label="Close story"><X size={23} /></button></div><div className="viewer-content">{dailyStories[selectedStory].text}</div><button className="viewer-prev" onClick={() => { setStoryMenu(false); setSelectedStory((selectedStory - 1 + dailyStories.length) % dailyStories.length) }} aria-label="Previous story"><ChevronLeft size={24} /></button><button className="viewer-next" onClick={() => setSelectedStory((selectedStory + 1) % dailyStories.length)} aria-label="Next story"><ChevronRight size={24} /></button></div></div>}
    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="modal-panel"><div className="modal-top"><h2>{modal === 'post' ? 'Share a moment' : modal === 'story' ? 'Add to your story' : modal === 'profile' ? 'Edit profile' : modal === 'notifications' ? 'Notifications' : modal === 'delete' ? 'Delete account' : isMember ? 'Your account' : 'Join MingleNest'}</h2><button onClick={() => setModal(null)} aria-label="Close"><X size={21} /></button></div>{modal === 'post' && <div className="modal-content"><div className="modal-person"><Avatar name={profile.name} color="sage" size="small" /><span><strong>{profile.name}</strong><small>Sharing with your circle</small></span></div><textarea autoFocus value={postText} onChange={e => setPostText(e.target.value)} placeholder="What’s a little moment you’d like to share?" rows={5} /><label className={`story-picker ${postImage ? 'has-image' : ''}`} style={postImage ? { backgroundImage: `url(${postImage})` } : undefined}><input type="file" accept="image/*" onChange={pickPostImage} aria-label="Choose a photo" /><span className="media-badge"><ImagePlus size={15} /> {postImage ? 'Change photo' : 'Add a photo'}</span></label><button className="primary-button modal-submit" onClick={publishPost} disabled={!postText.trim() || savingPost}>{savingPost ? 'Sharing...' : 'Share moment'} <ArrowRight size={17} /></button></div>}{modal === 'story' && <div className="modal-content"><p className="modal-description">A small glimpse into your day, shared with your people.</p><textarea autoFocus value={storyText} onChange={e => setStoryText(e.target.value)} placeholder="What’s happening today?" rows={4} /><label className={`story-picker ${storyImage ? 'has-image' : ''}`} style={storyImage ? { backgroundImage: `url(${storyImage})` } : undefined}><input type="file" accept="image/*" onChange={pickStoryImage} aria-label="Choose a story photo" /><span className="media-badge"><ImagePlus size={15} /> {storyImage ? 'Change photo' : 'Choose a photo'}</span></label><button className="primary-button modal-submit" onClick={publishStory} disabled={(!storyText.trim() && !storyFile) || savingStory}>{savingStory ? 'Sharing...' : 'Share story'} <ArrowRight size={17} /></button></div>}{modal === 'profile' && <div className="modal-content profile-form"><div className="media-edit"><label className={`cover-edit ${draftProfile.coverUrl ? 'has-image' : ''}`} style={draftProfile.coverUrl ? { backgroundImage: `url(${draftProfile.coverUrl})` } : undefined}><input type="file" accept="image/*" onChange={e => pickImage(e, 'cover')} aria-label="Choose cover photo" /><span className="media-badge"><Camera size={15} /> {draftProfile.coverUrl ? 'Change cover' : 'Add cover photo'}</span></label><label className="avatar-edit"><input type="file" accept="image/*" onChange={e => pickImage(e, 'avatar')} aria-label="Choose profile picture" /><Avatar name={draftProfile.name || '?'} image={draftProfile.avatarUrl} size="large" color="sage" /><span className="avatar-camera"><Camera size={14} /></span></label></div><label className="input-label">Your name<input value={draftProfile.name} onChange={e => setDraftProfile({ ...draftProfile, name: e.target.value })} /></label><label className="input-label">Username<input value={draftProfile.handle} onChange={e => setDraftProfile({ ...draftProfile, handle: e.target.value.replace(/\s/g, '').toLowerCase() })} /></label><label className="input-label">A little about you<textarea rows={3} value={draftProfile.bio} onChange={e => setDraftProfile({ ...draftProfile, bio: e.target.value })} /></label><button className="primary-button modal-submit" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save changes'} <Check size={17} /></button></div>}{modal === 'notifications' && <div className="modal-content notification-content"><div className="notification-icon"><Bell size={23} /></div><h3>All caught up.</h3><p>When your people share something new, you’ll find it here.</p></div>}{modal === 'delete' && <div className="modal-content delete-content"><h3>Delete your MingleNest account?</h3><p>Deleting your account removes your profile, posts, stories and saved Kids’ stories. You’ll be taken to a short request form to confirm your details. Nothing is deleted until the request is processed.</p><button className="primary-button danger-button modal-submit" onClick={() => { window.open('https://docs.google.com/forms/d/e/1FAIpQLSet39JW9olvDYwSEqF9C6Vyx8obVpNaUU9Ahsqxbm--jOC62g/viewform?usp=dialog', '_blank', 'noopener,noreferrer'); setModal(null) }}>Request Account Deletion</button><button className="secondary-button modal-submit" onClick={() => setModal(null)}>Keep my account</button></div>}{modal === 'account' && <div className="modal-content">{authUser ? <div className="account-success"><span><Check size={25} /></span><h3>You’re part of the nest.</h3><p>Signed in as {authUser.email}. Your private chats are available across devices.</p><button className="secondary-button" onClick={async () => { await supabase.auth.signOut(); setIsMember(false); setModal(null); setToast('Signed out of this device') }}>Sign out</button></div> : <><p className="modal-description">A cozy space for your people, your moments, and your stories.</p><div className="account-switch"><button className={accountMode === 'join' ? 'active' : ''} onClick={() => setAccountMode('join')}>Create account</button><button className={accountMode === 'login' ? 'active' : ''} onClick={() => setAccountMode('login')}>Sign in</button></div><form className="account-form" onSubmit={submitAccount}>{accountMode === 'join' && <label className="input-label">Your name<input required value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Alex Morgan" /></label>}<label className="input-label">Email address<input type="email" required value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="you@example.com" /></label><label className="input-label">Password<input type="password" required minLength={6} value={accountPassword} onChange={e => setAccountPassword(e.target.value)} placeholder="At least 6 characters" /></label><button className="primary-button modal-submit" type="submit">{accountMode === 'join' ? 'Join the nest' : 'Sign in'} <ArrowRight size={17} /></button></form><p className="local-note">Your account is securely saved for chats across devices.</p></>}</div>}</div></div>}
    {deletingMessageId && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setDeletingMessageId(null) }}><div className="modal-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-message-title"><div className="modal-top"><h2 id="delete-message-title">Delete this message?</h2></div><div className="modal-content" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}><button className="secondary-button" onClick={() => setDeletingMessageId(null)}>Cancel</button><button className="primary-button danger-button" onClick={() => { const message = privateMessages.find(item => item.id === deletingMessageId); if (message) void deletePrivateMessage(message) }} >Delete</button></div></div></div>}
    {toast && <div className="toast"><Check size={17} />{toast}</div>}
  </div>
}

export default App
