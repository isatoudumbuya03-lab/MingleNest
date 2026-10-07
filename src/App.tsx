import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bell, BookHeart, Bookmark, Camera, Check, ChevronLeft, ChevronRight, CirclePlus, Ellipsis, Heart, Home, ImagePlus, Mail, MessageCircle, Moon, Pencil, Plus, Search, Send, Mic, Square, Play, Pause, Settings2, Share2, Sparkles, Trash2, Flag, WandSparkles, X, Languages, UserPlus, Users, Globe2, CheckCheck } from 'lucide-react'
import { generateKidsStory } from './kidsStory'
import { getPrivateConversation, listChatContacts, readPrivateMessages, removePrivateMessage, sendPrivateText, sendPrivateVoice, type ChatContact, type PrivateMessage } from './privateChat'
import { confirmationRedirect, listenForAuthCallback } from './authCallback'
import type { User } from '@supabase/supabase-js'
import VoicePlayer, { voiceTime } from './VoicePlayer'
import { supabase, PROFILE_BUCKET, deviceId, resizeImage, blobToDataUrl } from './supabase'

type Profile = { name: string; handle: string; bio: string; avatarUrl?: string; coverUrl?: string }
type Comment = { id: string; userId: string; author: string; handle: string; avatar?: string; content: string; createdAt: string }
type Language = 'en' | 'fr' | 'es' | 'de' | 'pt' | 'it' | 'ar'
const LANGUAGES: Record<Language, string> = { en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', pt: 'Português', it: 'Italiano', ar: 'العربية' }
const UI_TEXT: Record<Language, Record<string, string>> = {
  en: { home: 'Home', stories: 'Stories', kids: 'Kids Stories', chats: 'Chats', profile: 'Profile', findUsers: 'Find Users', searchUsers: 'Search users...', settings: 'Settings', voice: 'Voice message', recording: 'Recording', preview: 'Preview', send: 'Send', discard: 'Discard', pause: 'Pause', resume: 'Resume', like: 'Like', unlike: 'Unlike', comment: 'Comment', delete: 'Delete', typeMessage: 'Write a message...' },
  fr: { home: 'Accueil', stories: 'Stories', kids: 'Histoires enfants', chats: 'Discussions', profile: 'Profil', findUsers: 'Trouver des utilisateurs', searchUsers: 'Rechercher des utilisateurs...', settings: 'Paramètres', voice: 'Message vocal', recording: 'Enregistrement', preview: 'Aperçu', send: 'Envoyer', discard: 'Supprimer', pause: 'Pause', resume: 'Reprendre', like: "J'aime", unlike: "Je n'aime plus", comment: 'Commenter', delete: 'Supprimer', typeMessage: 'Écrire un message...' },
  es: { home: 'Inicio', stories: 'Historias', kids: 'Historias infantiles', chats: 'Chats', profile: 'Perfil', findUsers: 'Buscar usuarios', searchUsers: 'Buscar usuarios...', settings: 'Ajustes', voice: 'Mensaje de voz', recording: 'Grabando', preview: 'Vista previa', send: 'Enviar', discard: 'Descartar', pause: 'Pausa', resume: 'Reanudar', like: 'Me gusta', unlike: 'Ya no me gusta', comment: 'Comentar', delete: 'Eliminar', typeMessage: 'Escribe un mensaje...' },
  de: { home: 'Start', stories: 'Stories', kids: 'Kinderstories', chats: 'Chats', profile: 'Profil', findUsers: 'Nutzer finden', searchUsers: 'Nutzer suchen...', settings: 'Einstellungen', voice: 'Sprachnachricht', recording: 'Aufnahme', preview: 'Vorschau', send: 'Senden', discard: 'Verwerfen', pause: 'Pause', resume: 'Fortsetzen', like: 'Gefällt mir', unlike: 'Gefällt mir nicht mehr', comment: 'Kommentieren', delete: 'Löschen', typeMessage: 'Nachricht schreiben...' },
  pt: { home: 'Início', stories: 'Stories', kids: 'Histórias infantis', chats: 'Conversas', profile: 'Perfil', findUsers: 'Encontrar usuários', searchUsers: 'Pesquisar usuários...', settings: 'Configurações', voice: 'Mensagem de voz', recording: 'Gravando', preview: 'Prévia', send: 'Enviar', discard: 'Descartar', pause: 'Pausar', resume: 'Continuar', like: 'Curtir', unlike: 'Descurtir', comment: 'Comentar', delete: 'Excluir', typeMessage: 'Escreva uma mensagem...' },
  it: { home: 'Home', stories: 'Storie', kids: 'Storie per bambini', chats: 'Chat', profile: 'Profilo', findUsers: 'Trova utenti', searchUsers: 'Cerca utenti...', settings: 'Impostazioni', voice: 'Messaggio vocale', recording: 'Registrazione', preview: 'Anteprima', send: 'Invia', discard: 'Scarta', pause: 'Pausa', resume: 'Riprendi', like: 'Mi piace', unlike: 'Non mi piace più', comment: 'Commenta', delete: 'Elimina', typeMessage: 'Scrivi un messaggio...' },
  ar: { home: 'الرئيسية', stories: 'القصص', kids: 'قصص الأطفال', chats: 'المحادثات', profile: 'الملف الشخصي', findUsers: 'البحث عن مستخدمين', searchUsers: 'ابحث عن مستخدمين...', settings: 'الإعدادات', voice: 'رسالة صوتية', recording: 'تسجيل', preview: 'معاينة', send: 'إرسال', discard: 'حذف', pause: 'إيقاف مؤقت', resume: 'متابعة', like: 'إعجاب', unlike: 'إلغاء الإعجاب', comment: 'تعليق', delete: 'حذف', typeMessage: 'اكتب رسالة...' }
}

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
