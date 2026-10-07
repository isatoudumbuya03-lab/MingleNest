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

const EXTRA_TEXT: Record<Language, Record<string, string>> = {
  en: { language:'Language', chooseLanguage:'Choose the language used around MingleNest.', notifications:'Notifications', unread:'unread', allCaughtUp:'All caught up.', selectLanguage:'selected', markAllRead:'Mark all read', noNotifications:'When your people share something new, you’ll find it here.', cancel:'Cancel', close:'Close', saveChanges:'Save changes', saving:'Saving...', shareMoment:'Share a moment', sharing:'Sharing...', addPhoto:'Add a photo', changePhoto:'Change photo', addStory:'Add to your story', shareStory:'Share story', typeStory:'What’s happening today?', editProfile:'Edit profile', account:'Your account', yourName:'Your name', username:'Username', email:'Email address', password:'Password', createAccount:'Create account', signIn:'Sign in', joinNest:'Join the nest', signOut:'Sign out', accountSaved:'Your account is securely saved for chats across devices.', noUsers:'No registered users found.', deleteQuestion:'Delete this message?', requestDeletion:'Request Account Deletion', keepAccount:'Keep my account', deleteAccount:'Delete account', yourBio:'A little about you', yourCircle:'Sharing with your circle', choosePhoto:'Choose a photo', addCover:'Add cover photo', changeCover:'Change cover', searchConversations:'Search conversations', messages:'Messages', openConversation:'Open conversation', peopleAppear:'Your people will appear here when they join MingleNest.', today:'Today', backToChats:'Back to chats', finishRecording:'Finish recording', sendMessage:'Send message', closer:'Closer, one message at a time.', chooseConversation:'Choose a conversation to catch up with your people.', navLabel:'Main navigation' },
  fr: { language:'Langue', chooseLanguage:'Choisissez la langue utilisée dans MingleNest.', notifications:'Notifications', unread:'non lues', allCaughtUp:'Tout est à jour.', markAllRead:'Tout marquer comme lu', noNotifications:'Vous trouverez ici les nouveautés partagées par vos proches.', cancel:'Annuler', close:'Fermer', saveChanges:'Enregistrer les modifications', saving:'Enregistrement...', shareMoment:'Partager un moment', sharing:'Partage...', addPhoto:'Ajouter une photo', changePhoto:'Changer la photo', addStory:'Ajouter à votre story', shareStory:'Partager la story', typeStory:'Que se passe-t-il aujourd’hui ?', editProfile:'Modifier le profil', account:'Votre compte', yourName:'Votre nom', username:"Nom d’utilisateur", email:'Adresse e-mail', password:'Mot de passe', createAccount:'Créer un compte', signIn:'Se connecter', joinNest:'Rejoindre le nid', signOut:'Se déconnecter', accountSaved:'Votre compte est enregistré en toute sécurité pour vos discussions.', noUsers:'Aucun utilisateur inscrit trouvé.', deleteQuestion:'Supprimer ce message ?', requestDeletion:'Demander la suppression du compte', keepAccount:'Garder mon compte', deleteAccount:'Supprimer le compte', yourBio:'Quelques mots sur vous', yourCircle:'Partagé avec votre cercle', choosePhoto:'Choisir une photo', addCover:'Ajouter une photo de couverture', changeCover:'Changer la couverture', searchConversations:'Rechercher des conversations', messages:'Messages', openConversation:'Ouvrir la conversation', peopleAppear:'Vos contacts apparaîtront ici lorsqu’ils rejoindront MingleNest.', today:'Aujourd’hui', backToChats:'Retour aux discussions', finishRecording:'Terminer l’enregistrement', sendMessage:'Envoyer le message', closer:'Plus proches, un message à la fois.', chooseConversation:'Choisissez une conversation pour retrouver vos proches.', navLabel:'Navigation principale' },
  es: { language:'Idioma', chooseLanguage:'Elige el idioma usado en MingleNest.', notifications:'Notificaciones', unread:'sin leer', allCaughtUp:'Todo al día.', markAllRead:'Marcar todo como leído', noNotifications:'Aquí encontrarás las novedades que comparten tus contactos.', cancel:'Cancelar', close:'Cerrar', saveChanges:'Guardar cambios', saving:'Guardando...', shareMoment:'Compartir un momento', sharing:'Compartiendo...', addPhoto:'Añadir foto', changePhoto:'Cambiar foto', addStory:'Añadir a tu historia', shareStory:'Compartir historia', typeStory:'¿Qué está pasando hoy?', editProfile:'Editar perfil', account:'Tu cuenta', yourName:'Tu nombre', username:'Nombre de usuario', email:'Correo electrónico', password:'Contraseña', createAccount:'Crear cuenta', signIn:'Iniciar sesión', joinNest:'Unirme al nido', signOut:'Cerrar sesión', accountSaved:'Tu cuenta se guarda de forma segura para tus chats.', noUsers:'No se encontraron usuarios registrados.', deleteQuestion:'¿Eliminar este mensaje?', requestDeletion:'Solicitar eliminación de cuenta', keepAccount:'Conservar mi cuenta', deleteAccount:'Eliminar cuenta', yourBio:'Un poco sobre ti', yourCircle:'Compartiendo con tu círculo', choosePhoto:'Elegir una foto', addCover:'Añadir foto de portada', changeCover:'Cambiar portada', searchConversations:'Buscar conversaciones', messages:'Mensajes', openConversation:'Abrir conversación', peopleAppear:'Tus contactos aparecerán cuando se unan a MingleNest.', today:'Hoy', backToChats:'Volver a chats', finishRecording:'Terminar grabación', sendMessage:'Enviar mensaje', closer:'Más cerca, un mensaje a la vez.', chooseConversation:'Elige una conversación para ponerte al día con tus contactos.', navLabel:'Navegación principal' },
  de: { language:'Sprache', chooseLanguage:'Wähle die Sprache für MingleNest.', notifications:'Benachrichtigungen', unread:'ungelesen', allCaughtUp:'Alles erledigt.', markAllRead:'Alle als gelesen markieren', noNotifications:'Hier findest du neue Aktivitäten deiner Kontakte.', cancel:'Abbrechen', close:'Schließen', saveChanges:'Änderungen speichern', saving:'Speichern...', shareMoment:'Einen Moment teilen', sharing:'Wird geteilt...', addPhoto:'Foto hinzufügen', changePhoto:'Foto ändern', addStory:'Zu deiner Story hinzufügen', shareStory:'Story teilen', typeStory:'Was passiert heute?', editProfile:'Profil bearbeiten', account:'Dein Konto', yourName:'Dein Name', username:'Benutzername', email:'E-Mail-Adresse', password:'Passwort', createAccount:'Konto erstellen', signIn:'Anmelden', joinNest:'Dem Nest beitreten', signOut:'Abmelden', accountSaved:'Dein Konto wird sicher für deine Chats gespeichert.', noUsers:'Keine registrierten Nutzer gefunden.', deleteQuestion:'Diese Nachricht löschen?', requestDeletion:'Kontolöschung anfordern', keepAccount:'Konto behalten', deleteAccount:'Konto löschen', yourBio:'Ein bisschen über dich', yourCircle:'Mit deinem Kreis teilen', choosePhoto:'Foto auswählen', addCover:'Titelbild hinzufügen', changeCover:'Titelbild ändern', searchConversations:'Unterhaltungen suchen', messages:'Nachrichten', openConversation:'Unterhaltung öffnen', peopleAppear:'Deine Kontakte erscheinen hier, wenn sie MingleNest beitreten.', today:'Heute', backToChats:'Zurück zu Chats', finishRecording:'Aufnahme beenden', sendMessage:'Nachricht senden', closer:'Näher, eine Nachricht nach der anderen.', chooseConversation:'Wähle eine Unterhaltung, um dich mit deinen Kontakten auszutauschen.', navLabel:'Hauptnavigation' },
  pt: { language:'Idioma', chooseLanguage:'Escolha o idioma usado no MingleNest.', notifications:'Notificações', unread:'não lidas', allCaughtUp:'Tudo em dia.', markAllRead:'Marcar tudo como lido', noNotifications:'As novidades dos seus contatos aparecerão aqui.', cancel:'Cancelar', close:'Fechar', saveChanges:'Salvar alterações', saving:'Salvando...', shareMoment:'Compartilhar um momento', sharing:'Compartilhando...', addPhoto:'Adicionar foto', changePhoto:'Alterar foto', addStory:'Adicionar ao seu story', shareStory:'Compartilhar story', typeStory:'O que está acontecendo hoje?', editProfile:'Editar perfil', account:'Sua conta', yourName:'Seu nome', username:'Nome de usuário', email:'E-mail', password:'Senha', createAccount:'Criar conta', signIn:'Entrar', joinNest:'Entrar no ninho', signOut:'Sair', accountSaved:'Sua conta é salva com segurança para seus chats.', noUsers:'Nenhum usuário registrado encontrado.', deleteQuestion:'Excluir esta mensagem?', requestDeletion:'Solicitar exclusão da conta', keepAccount:'Manter minha conta', deleteAccount:'Excluir conta', yourBio:'Um pouco sobre você', yourCircle:'Compartilhando com seu círculo', choosePhoto:'Escolher uma foto', addCover:'Adicionar foto de capa', changeCover:'Alterar capa', searchConversations:'Pesquisar conversas', messages:'Mensagens', openConversation:'Abrir conversa', peopleAppear:'Seus contatos aparecerão aqui quando entrarem no MingleNest.', today:'Hoje', backToChats:'Voltar para chats', finishRecording:'Finalizar gravação', sendMessage:'Enviar mensagem', closer:'Mais perto, uma mensagem por vez.', chooseConversation:'Escolha uma conversa para falar com seus contatos.', navLabel:'Navegação principal' },
  it: { language:'Lingua', chooseLanguage:'Scegli la lingua usata in MingleNest.', notifications:'Notifiche', unread:'non lette', allCaughtUp:'Tutto aggiornato.', markAllRead:'Segna tutto come letto', noNotifications:'Qui troverai le novità condivise dai tuoi contatti.', cancel:'Annulla', close:'Chiudi', saveChanges:'Salva modifiche', saving:'Salvataggio...', shareMoment:'Condividi un momento', sharing:'Condivisione...', addPhoto:'Aggiungi foto', changePhoto:'Cambia foto', addStory:'Aggiungi alla tua storia', shareStory:'Condividi storia', typeStory:'Cosa succede oggi?', editProfile:'Modifica profilo', account:'Il tuo account', yourName:'Il tuo nome', username:'Nome utente', email:'Indirizzo email', password:'Password', createAccount:'Crea account', signIn:'Accedi', joinNest:'Entra nel nido', signOut:'Esci', accountSaved:'Il tuo account è salvato in modo sicuro per le chat.', noUsers:'Nessun utente registrato trovato.', deleteQuestion:'Eliminare questo messaggio?', requestDeletion:'Richiedi eliminazione account', keepAccount:'Mantieni il mio account', deleteAccount:'Elimina account', yourBio:'Qualcosa su di te', yourCircle:'Condiviso con il tuo gruppo', choosePhoto:'Scegli una foto', addCover:'Aggiungi foto di copertina', changeCover:'Cambia copertina', searchConversations:'Cerca conversazioni', messages:'Messaggi', openConversation:'Apri conversazione', peopleAppear:'I tuoi contatti appariranno qui quando entreranno in MingleNest.', today:'Oggi', backToChats:'Torna alle chat', finishRecording:'Termina registrazione', sendMessage:'Invia messaggio', closer:'Più vicini, un messaggio alla volta.', chooseConversation:'Scegli una conversazione per parlare con i tuoi contatti.', navLabel:'Navigazione principale' },
  ar: { language:'اللغة', chooseLanguage:'اختر اللغة المستخدمة في MingleNest.', notifications:'الإشعارات', unread:'غير مقروءة', allCaughtUp:'كل شيء محدث.', markAllRead:'تحديد الكل كمقروء', noNotifications:'ستجد هنا آخر ما يشاركه الأشخاص الذين تتواصل معهم.', cancel:'إلغاء', close:'إغلاق', saveChanges:'حفظ التغييرات', saving:'جارٍ الحفظ...', shareMoment:'مشاركة لحظة', sharing:'جارٍ المشاركة...', addPhoto:'إضافة صورة', changePhoto:'تغيير الصورة', addStory:'إضافة إلى قصتك', shareStory:'مشاركة القصة', typeStory:'ماذا يحدث اليوم؟', editProfile:'تعديل الملف الشخصي', account:'حسابك', yourName:'اسمك', username:'اسم المستخدم', email:'البريد الإلكتروني', password:'كلمة المرور', createAccount:'إنشاء حساب', signIn:'تسجيل الدخول', joinNest:'انضم إلى العش', signOut:'تسجيل الخروج', accountSaved:'يتم حفظ حسابك بأمان لمحادثاتك.', noUsers:'لم يتم العثور على مستخدمين مسجلين.', deleteQuestion:'هل تريد حذف هذه الرسالة؟', requestDeletion:'طلب حذف الحساب', keepAccount:'الاحتفاظ بحسابي', deleteAccount:'حذف الحساب', yourBio:'نبذة عنك', yourCircle:'مشاركة مع دائرتك', choosePhoto:'اختر صورة', addCover:'إضافة صورة غلاف', changeCover:'تغيير الغلاف', searchConversations:'البحث في المحادثات', messages:'الرسائل', openConversation:'فتح المحادثة', peopleAppear:'سيظهر الأشخاص هنا عند انضمامهم إلى MingleNest.', today:'اليوم', backToChats:'العودة إلى المحادثات', finishRecording:'إنهاء التسجيل', sendMessage:'إرسال الرسالة', closer:'أقرب، رسالة واحدة في كل مرة.', chooseConversation:'اختر محادثة للتواصل مع الأشخاص لديك.', navLabel:'التنقل الرئيسي' }
}

type Tab = 'home' | 'stories' | 'create' | 'chats' | 'profile'
type Post = { id: number; cloudId?: string; ownerId?: string; author: string; handle: string; avatar: string; time: string; text: string; image?: string; likes: number; comments: number; liked?: boolean; saved?: boolean }
type ChatMessage = { id?: string; from: 'me' | 'them'; text: string; time: string }
type KidStory = { id?: string; title: string; child: string; theme: string; text: string; date: string }
type AppNotification = { id: string; recipient_id: string; actor_id: string | null; type: string; message: string; post_id: string | null; story_id: string | null; conversation_id: string | null; created_at: string; read_at: string | null }

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
const tabs: { id: Tab; key: string; Icon: typeof Home }[] = [
  { id: 'home', key: 'home', Icon: Home }, { id: 'stories', key: 'stories', Icon: CirclePlus }, { id: 'create', key: 'kids', Icon: BookHeart }, { id: 'chats', key: 'chats', Icon: MessageCircle }, { id: 'profile', key: 'profile', Icon: Settings2 },
]
const readStore = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback } }

function Avatar({ name, image, size = 'normal', color = 'peach' }: { name: string; image?: string; size?: 'small' | 'normal' | 'large'; color?: string }) {
  return <span className={`avatar avatar-${size} avatar-${color}`}>{image ? <img src={image} alt={name} /> : name.charAt(0).toUpperCase()}</span>
}

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [profile, setProfile] = useState<Profile>(() => readStore<Profile>('mn-profile', { name: 'Alex Morgan', handle: 'alexmorgan', bio: 'Collecting little moments and good stories. ✨' }))
  const [posts, setPosts] = useState<Post[]>(() => readStore('mn-posts', initialPosts))
  const [dailyStories, setDailyStories] = useState<{ id?: string | number; ownerId?: string; name: string; handle?: string; text: string; image?: string; likes?: number; liked?: boolean; comments?: number }[]>(() => readStore('mn-daily', [{ name: 'Maya Chen', text: 'An afternoon worth remembering ☀️', image: photos.friends }, { name: 'Olivia Park', text: 'A little joy in the everyday.', image: photos.portrait }, { name: 'Leo Martin', text: 'Out here making memories.', image: photos.picnic }]))
  const [kidStories, setKidStories] = useState<KidStory[]>(() => readStore('mn-kids', []))
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>(() => readStore('mn-chats', initialConversations))
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [activeContactId, setActiveContactId] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [modal, setModal] = useState<'post' | 'story' | 'profile' | 'account' | 'notifications' | 'delete' | 'find-users' | 'settings' | null>(null)
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
  const [comments, setComments] = useState<Record<number, Comment[]>>({})
  const [storyComments, setStoryComments] = useState<Record<string, Comment[]>>({})
  const [showStoryComments, setShowStoryComments] = useState(false)
  const [findUsersQuery, setFindUsersQuery] = useState('')
  const [userResults, setUserResults] = useState<ChatContact[]>([])
  const [language, setLanguage] = useState<Language>(() => (readStore<Language>('mn-language', 'en') || 'en') as Language)
  const t = (key: string) => EXTRA_TEXT[language]?.[key] ?? UI_TEXT[language]?.[key] ?? EXTRA_TEXT.en[key] ?? UI_TEXT.en[key] ?? key
  const isRTL = language === 'ar'
  const [toast, setToast] = useState('')
  const [isMember, setIsMember] = useState(() => readStore('mn-member', false))
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [accountMode, setAccountMode] = useState<'join' | 'login'>('join')
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const unreadNotifications = notifications.filter(item => !item.read_at).length
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
  const [recordingPaused, setRecordingPaused] = useState(false)
  const [voicePreviewUrl, setVoicePreviewUrl] = useState('')
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false)
  const pausedAtRef = useRef(0)
  const pausedTotalRef = useRef(0)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startedRef = useRef(0)
  const discardRef = useRef(false)
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => { localStorage.setItem('mn-language', language) }, [language])
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
    if (!authUser) { setNotifications([]); return }
    let live = true
    const loadNotifications = async () => {
      const { data, error } = await supabase.from('notifications').select('id,recipient_id,actor_id,type,message,post_id,story_id,conversation_id,created_at,read_at').eq('recipient_id', authUser.id).order('created_at', { ascending: false }).limit(100)
      if (!live) return
      if (error) { console.warn('Notification load failed', error); return }
      setNotifications((data || []) as AppNotification[])
    }
    void loadNotifications()
    const channel = supabase.channel(`notifications-${authUser.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${authUser.id}` }, payload => {
      if (!live) return
      setNotifications(current => [payload.new as AppNotification, ...current.filter(item => item.id !== (payload.new as AppNotification).id)].slice(0, 100))
    }).subscribe()
    return () => { live = false; void supabase.removeChannel(channel) }
  }, [authUser?.id])

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
      const [postResult, storyResult, profileResult, likeResult, commentResult, storyLikeResult, storyCommentResult, kidResult] = await Promise.all([
        supabase.from('posts').select('id,user_id,content,image_url,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('stories').select('id,user_id,caption,media_url').order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('id,full_name,username'),
        supabase.from('post_reactions').select('post_id,user_id'),
        supabase.from('post_comments').select('id,post_id,user_id,content,created_at').order('created_at'),
        supabase.from('story_reactions').select('story_id,user_id'),
        supabase.from('story_comments').select('id,story_id,user_id,content,created_at').order('created_at'),
        supabase.from('kids_stories').select('id,title,content').eq('user_id', authUser.id).order('created_at', { ascending: false }),
      ])
      if (!live) return
      const names = new Map((profileResult.data || []).map(person => [person.id, person]))
      if (!postResult.error) setPosts([...((postResult.data || []).map(item => {
        const owner = names.get(item.user_id)
        const likes = (likeResult.data || []).filter(like => like.post_id === item.id)
        return { id: parseInt(item.id.replace(/-/g, '').slice(0, 12), 16), cloudId: item.id, ownerId: item.user_id, author: owner?.full_name || 'Member', handle: owner?.username || 'member', avatar: (owner?.full_name || 'M')[0], time: new Date(item.created_at).toLocaleDateString(), text: item.content || '', image: item.image_url || undefined, likes: likes.length, comments: (commentResult.data || []).filter(comment => comment.post_id === item.id).length, liked: likes.some(like => like.user_id === authUser.id) } as Post
      })), ...initialPosts])
      if (!storyResult.error) setDailyStories([...(storyResult.data || []).map(item => ({ id: item.id, ownerId: item.user_id, name: names.get(item.user_id)?.full_name || 'Member', handle: names.get(item.user_id)?.username || 'member', text: item.caption || '', image: item.media_url || undefined, likes: (storyLikeResult.data || []).filter(like => like.story_id === item.id).length, liked: (storyLikeResult.data || []).some(like => like.story_id === item.id && like.user_id === authUser.id), comments: (storyCommentResult.data || []).filter(comment => comment.story_id === item.id).length })), { name: 'Maya Chen', text: 'An afternoon worth remembering ☀️', image: photos.friends }, { name: 'Olivia Park', text: 'A little joy in the everyday.', image: photos.portrait }, { name: 'Leo Martin', text: 'Out here making memories.', image: photos.picnic }])
      if (!commentResult.error) {
        const mapped: Record<number, Comment[]> = {}
        for (const item of commentResult.data || []) {
          const key = parseInt(item.post_id.replace(/-/g, '').slice(0, 12), 16)
          const owner = names.get(item.user_id)
          ;(mapped[key] ||= []).push({ id: item.id, userId: item.user_id, author: owner?.full_name || 'Member', handle: owner?.username || 'member', avatar: undefined, content: item.content, createdAt: item.created_at })
        }
        setComments(mapped)
      }
      if (!storyCommentResult.error) {
        const mapped: Record<string, Comment[]> = {}
        for (const item of storyCommentResult.data || []) {
          const owner = names.get(item.user_id)
          ;(mapped[item.story_id] ||= []).push({ id: item.id, userId: item.user_id, author: owner?.full_name || 'Member', handle: owner?.username || 'member', avatar: undefined, content: item.content, createdAt: item.created_at })
        }
        setStoryComments(mapped)
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
  }, [authUser?.id, tab, activeContactId])
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
    if (!recording || recordingPaused) return
    const interval = window.setInterval(() => setRecordingMs(Date.now() - startedRef.current - pausedTotalRef.current), 200)
    return () => window.clearInterval(interval)
  }, [recording, recordingPaused])
  useEffect(() => () => { if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl); discardRef.current = true; if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); streamRef.current?.getTracks().forEach(track => track.stop()) }, [])
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
  const findUsers = async () => {
    if (!authUser) { setToast('Sign in to find MingleNest users'); return }
    const q = findUsersQuery.trim().replace(/^@/, '')
    if (!q) { setUserResults([]); return }
    const { data, error } = await supabase.from('chat_users').select('id,display_name').neq('id', authUser.id).ilike('display_name', `%${q}%`).order('display_name').limit(30)
    if (error) { setToast('Could not search users'); return }
    setUserResults((data || []).map(person => ({ id: person.id, name: person.display_name })))
  }
  const markNotificationRead = async (id: string) => {
    if (!authUser) return
    const now = new Date().toISOString()
    setNotifications(items => items.map(item => item.id === id ? { ...item, read_at: item.read_at || now } : item))
    await supabase.from('notifications').update({ read_at: now }).eq('id', id).eq('recipient_id', authUser.id)
  }
  const markAllNotificationsRead = async () => {
    if (!authUser || !unreadNotifications) return
    const now = new Date().toISOString()
    setNotifications(items => items.map(item => item.read_at ? item : { ...item, read_at: now }))
    await supabase.from('notifications').update({ read_at: now }).eq('recipient_id', authUser.id).is('read_at', null)
  }
  const openNotification = async (item: AppNotification) => {
    await markNotificationRead(item.id)
    setModal(null)
    if (item.conversation_id && item.actor_id) {
      const person = contacts.find(contact => contact.id === item.actor_id)
      if (person) openChat(person.name, person.id)
      else { setTab('chats'); setToast('Open Chats to view this conversation') }
      return
    }
    if (item.post_id) { setTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (item.story_id) { setTab('stories'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
  }
  const chooseLanguage = (value: Language) => { setLanguage(value); setModal('settings'); setToast(`${LANGUAGES[value]} ${EXTRA_TEXT[value].selectLanguage}`) }
  const openTab = (next: Tab) => { if (recording) stopRecording(true); discardVoiceDraft(); setTab(next); setActiveChat(null); setActiveContactId(null); setGenerated(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openChat = (name: string, id: string | null) => { if (!id) { setToast('This person has not joined chat yet'); return } if (recording) stopRecording(true); setVoiceDraft(null); setActiveChat(name); setActiveContactId(id); setTab('chats') }
  const toggleLike = async (id: number) => {
    const post = posts.find(item => item.id === id)
    if (!post) return
    if (post.cloudId && !authUser) { setToast('Sign in to like posts'); return }
    const wasLiked = !!post.liked
    setPosts(items => items.map(item => item.id === id ? { ...item, liked: !wasLiked, likes: Math.max(0, item.likes + (wasLiked ? -1 : 1)) } : item))
    if (post.cloudId && authUser) {
      const { error } = wasLiked
        ? await supabase.from('post_reactions').delete().eq('post_id', post.cloudId).eq('user_id', authUser.id)
        : await supabase.from('post_reactions').insert({ post_id: post.cloudId, user_id: authUser.id })
      if (error) {
        setPosts(items => items.map(item => item.id === id ? { ...item, liked: wasLiked, likes: Math.max(0, item.likes + (wasLiked ? 1 : -1)) } : item))
        setToast('Could not update your reaction')
      }
    }
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
  const toggleStoryLike = async (index: number) => {
    const story = dailyStories[index]
    if (!story?.id || !authUser || typeof story.id !== 'string') { if (!authUser) setToast('Sign in to like stories'); return }
    const wasLiked = !!story.liked
    setDailyStories(items => items.map((item, i) => i === index ? { ...item, liked: !wasLiked, likes: Math.max(0, (item.likes || 0) + (wasLiked ? -1 : 1)) } : item))
    const result = wasLiked
      ? await supabase.from('story_reactions').delete().eq('story_id', story.id).eq('user_id', authUser.id)
      : await supabase.from('story_reactions').insert({ story_id: story.id, user_id: authUser.id })
    if (result.error) {
      setDailyStories(items => items.map((item, i) => i === index ? { ...item, liked: wasLiked, likes: Math.max(0, (item.likes || 0) + (wasLiked ? 1 : -1)) } : item))
      setToast('Could not update story reaction')
    }
  }
  const addStoryComment = async (index: number, text: string) => {
    const story = dailyStories[index]
    if (!story?.id || typeof story.id !== 'string' || !authUser || !text.trim()) return
    const { data, error } = await supabase.from('story_comments').insert({ story_id: story.id, user_id: authUser.id, content: text.trim().normalize('NFC') }).select('id,user_id,content,created_at').single()
    if (error) { setToast('Could not add story comment'); return }
    const comment: Comment = { id: data.id, userId: authUser.id, author: profile.name, handle: profile.handle, avatar: profile.avatarUrl, content: data.content, createdAt: data.created_at }
    setStoryComments(current => ({ ...current, [story.id as string]: [...(current[story.id as string] || []), comment] }))
    setDailyStories(items => items.map((item, i) => i === index ? { ...item, comments: (item.comments || 0) + 1 } : item))
  }
  const deleteStoryComment = async (storyId: string, comment: Comment) => {
    if (!authUser || comment.userId !== authUser.id) return
    const { error } = await supabase.from('story_comments').delete().eq('id', comment.id).eq('user_id', authUser.id)
    if (error) { setToast('Could not delete story comment'); return }
    setStoryComments(current => ({ ...current, [storyId]: (current[storyId] || []).filter(item => item.id !== comment.id) }))
    setDailyStories(items => items.map(item => item.id === storyId ? { ...item, comments: Math.max(0, (item.comments || 0) - 1) } : item))
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
  const discardVoiceDraft = () => {
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl)
    setVoicePreviewUrl('')
    setVoicePreviewPlaying(false)
    setVoiceDraft(null)
    setRecordingMs(0)
    setRecordingPaused(false)
    pausedAtRef.current = 0
    pausedTotalRef.current = 0
  }
  const startRecording = async () => {
    if (!authUser || !chatId) { setToast('Sign in and choose a real contact to record'); return }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setToast('Microphone recording is not available on this device'); return }
    try {
      discardVoiceDraft()
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
        setRecordingPaused(false)
        if (discardRef.current) return
        const durationMs = Date.now() - startedRef.current - pausedTotalRef.current
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/mp4' })
        if (blob.size && durationMs > 0) {
          setVoiceDraft({ blob, durationMs })
          setVoicePreviewUrl(URL.createObjectURL(blob))
        } else setToast('Recording was empty; please try again')
      }
      recorder.onerror = () => { stream.getTracks().forEach(track => track.stop()); streamRef.current = null; setRecording(false); setToast('Recording failed') }
      recorder.start(250)
      startedRef.current = Date.now(); pausedAtRef.current = 0; pausedTotalRef.current = 0; setRecordingMs(0); setRecordingPaused(false); setRecording(true)
    } catch (error) { setToast(error instanceof Error && error.message.startsWith('Audio format') ? error.message : 'Microphone permission is needed to record a voice message') }
  }
  const pauseRecording = () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    recorder.pause()
    pausedAtRef.current = Date.now()
    setRecordingPaused(true)
  }
  const resumeRecording = () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'paused') return
    pausedTotalRef.current += Date.now() - pausedAtRef.current
    pausedAtRef.current = 0
    recorder.resume()
    setRecordingPaused(false)
  }
  const stopRecording = (cancel = false) => {
    if (recorderRef.current && (recorderRef.current.state === 'recording' || recorderRef.current.state === 'paused')) {
      discardRef.current = cancel
      recorderRef.current.stop()
    }
    if (cancel) discardVoiceDraft()
  }
  const sendRecording = async () => {
    if (!authUser || !chatId || !voiceDraft || chatBusy) return
    setChatBusy(true)
    try {
      const message = await sendPrivateVoice(chatId, authUser.id, voiceDraft.blob, voiceDraft.durationMs)
      setPrivateMessages(prev => prev.some(item => item.id === message.id) ? prev : [...prev, message])
      discardVoiceDraft()
    } catch (error) { setToast(error instanceof Error ? error.message : 'Voice message could not be sent') }
    finally { setChatBusy(false) }
  }
  const addComment = async (id: number) => {
    if (!commentText.trim() || !authUser) { if (!authUser) setToast('Sign in to comment'); return }
    const post = posts.find(item => item.id === id)
    if (!post?.cloudId) return
    const text = commentText.trim().normalize('NFC')
    const { data, error } = await supabase.from('post_comments').insert({ post_id: post.cloudId, user_id: authUser.id, content: text }).select('id,user_id,content,created_at').single()
    if (error) { setToast('Could not add your comment'); return }
    const comment: Comment = { id: data.id, userId: authUser.id, author: profile.name, handle: profile.handle, avatar: profile.avatarUrl, content: data.content, createdAt: data.created_at }
    setComments(current => ({ ...current, [id]: [...(current[id] || []), comment] }))
    setPosts(items => items.map(item => item.id === id ? { ...item, comments: item.comments + 1 } : item))
    setCommentText('')
  }
  const deletePostComment = async (postId: number, comment: Comment) => {
    if (!authUser || comment.userId !== authUser.id) return
    const post = posts.find(item => item.id === postId)
    if (!post?.cloudId) return
    const { error } = await supabase.from('post_comments').delete().eq('id', comment.id).eq('user_id', authUser.id)
    if (error) { setToast('Could not delete comment'); return }
    setComments(current => ({ ...current, [postId]: (current[postId] || []).filter(item => item.id !== comment.id) }))
    setPosts(items => items.map(item => item.id === postId ? { ...item, comments: Math.max(0, item.comments - 1) } : item))
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

  return <div className="app-shell" dir={isRTL ? 'rtl' : 'ltr'} lang={language}>
    <aside className="desktop-rail">
      <button className="brand desktop-brand" onClick={() => openTab('home')} aria-label="MingleNest home"><span className="brand-mark"><img src="/minglenest-logo.png" alt="" /></span><span>Mingle<span className="brand-light">Nest</span></span></button>
      <div className="rail-caption">YOUR LITTLE CORNER OF THE WORLD</div>
      <nav className="rail-nav" aria-label={t('navLabel')}>{tabs.map(({ id, key, Icon }) => <button key={id} className={`rail-link ${tab === id ? 'active' : ''}`} onClick={() => openTab(id)}><Icon size={21} strokeWidth={tab === id ? 2.3 : 1.9} /><span>{t(key)}</span>{id === 'chats' && <span className="nav-dot" />}</button>)}</nav>
      <div className="rail-bottom"><div className="rail-note"><span className="note-sparkle"><Sparkles size={20} /></span><strong>Make a little magic</strong><p>Turn their big imagination into a bedtime story.</p><button onClick={() => openTab('create')}>Create a story <ArrowRight size={15} /></button></div><button className="rail-person" onClick={() => openTab('profile')}><Avatar name={profile.name} image={profile.avatarUrl} size="small" color="sage" /><span><strong>{profile.name}</strong><small>@{profile.handle}</small></span><ChevronRight size={18} /></button></div>
    </aside>

    <main className="main-area">
      <header className="mobile-topbar"><button className="brand" onClick={() => openTab('home')} aria-label="MingleNest home"><span className="brand-mark"><img src="/minglenest-logo.png" alt="" /></span><span>Mingle<span className="brand-light">Nest</span></span></button><div style={{display:"flex",gap:8}}><button className="icon-button" onClick={() => setModal('find-users')} aria-label="Find users"><UserPlus size={20} /></button><button className="icon-button" onClick={() => setModal('settings')} aria-label="Settings"><Languages size={20} /></button><button className="icon-button notification-button" onClick={() => setModal('notifications')} aria-label="Notifications"><Bell size={21} />{unreadNotifications > 0 && <span className="notification-badge">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}</button></div></header>
      <div className="page-content">
      {tab === 'home' && <>
        <div className="home-heading"><div><div className="eyebrow">YOUR SPACE TO CONNECT <span className="eyebrow-line" /></div><h1>Good to see you, <em>{profile.name.split(' ')[0]}.</em></h1><p>Here’s what’s happening in your little corner of the world.</p></div><button className="desktop-action" onClick={() => setModal('post')}><Plus size={18} /> Share a moment</button></div>
        <div className="home-layout"><div className="feed-column">
          <section className="story-strip"><div className="section-row"><h2>Little moments</h2><button className="text-link" onClick={() => openTab('stories')}>See all <ArrowRight size={15} /></button></div><div className="story-avatars"><button className="story-person" onClick={() => setModal('story')}><span className="add-story-ring"><span><Plus size={24} /></span></span><small>Your story</small></button>{dailyStories.slice(0, 5).map((story, index) => <button className="story-person" key={`${story.name}-${index}`} onClick={() => setSelectedStory(index)}><span className="story-ring"><Avatar name={story.name} image={story.image} color={people[index % people.length].color} size="large" /></span><small>{story.name.split(' ')[0]}</small></button>)}</div></section>
          <button className="composer" onClick={() => setModal('post')}><Avatar name={profile.name} color="sage" size="small" /><span>What's on your mind, {profile.name.split(' ')[0]}?</span><span className="composer-plus"><Plus size={18} /></span></button>
          <div className="section-row feed-title"><div><h2>From your circle</h2><p>The moments worth sharing</p></div><span className="feed-label">LATEST</span></div>
          <div className="post-list">{posts.map(post => <article className="post-card" key={post.id}><div className="post-header"><Avatar name={post.author} image={post.author === 'Maya Chen' ? photos.portrait : undefined} color={post.author === 'Olivia Park' ? 'lilac' : post.author === 'Leo Martin' ? 'sage' : 'yellow'} /><div className="post-author"><strong>{post.author}</strong><span>@{post.handle} · {post.time}</span></div><div className="post-menu-wrap"><button className="subtle-icon" onClick={() => setMenuPost(menuPost === post.id ? null : post.id)} aria-label="More post options" aria-expanded={menuPost === post.id}><Ellipsis size={21} /></button>{menuPost === post.id && <><div className="menu-scrim" onClick={() => setMenuPost(null)} /><div className="post-menu" role="menu">{canDeletePost(post) && <button role="menuitem" className="danger" onClick={() => deletePost(post.id)}><Trash2 size={16} /> Delete Post</button>}<button role="menuitem" onClick={() => { setMenuPost(null); setToast('Thanks — we’ll review this post') }}><Flag size={16} /> Report Post</button></div></>}</div></div><p className="post-text">{post.text}</p>{post.image && <img className="post-image" src={post.image} alt={`A moment shared by ${post.author}`} />}<div className="post-actions"><button className={post.liked ? 'liked' : ''} onClick={() => toggleLike(post.id)} aria-label="Like post"><Heart size={19} fill={post.liked ? 'currentColor' : 'none'} /><span>{post.likes}</span></button><button onClick={() => setShowComments(showComments === post.id ? null : post.id)} aria-label="View comments"><MessageCircle size={19} /><span>{post.comments}</span></button><button onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast('Link copied to clipboard') }} aria-label="Share post"><Share2 size={18} /><span>Share</span></button><button className={`save-action ${post.saved ? 'liked' : ''}`} onClick={() => toggleSave(post.id)} aria-label="Save post"><Bookmark size={19} fill={post.saved ? 'currentColor' : 'none'} /></button></div>{showComments === post.id && <div className="comments-area"><p>Join the conversation</p>{(comments[post.id] || []).map(comment => <div className="comment" key={comment.id}><Avatar name={comment.author} image={comment.avatar} size="small" /><div><strong>{comment.author}</strong><small>@{comment.handle}</small><span>{comment.content}</span></div>{comment.userId === authUser?.id && <button onClick={() => void deletePostComment(post.id, comment)} aria-label={t('delete')}><Trash2 size={13} /></button>}</div>)}<form onSubmit={e => { e.preventDefault(); addComment(post.id) }}><input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a kind comment..." aria-label="Write a comment" /><button type="submit" aria-label="Send comment"><Send size={17} /></button></form></div>}</article>)}</div>
        </div><aside className="home-side"><div className="welcome-card"><div className="welcome-icon"><Heart size={20} fill="currentColor" /></div><h3>A place to feel at home.</h3><p>Share the ordinary, celebrate the extraordinary, and stay close to your people.</p><span>GOOD THINGS GROW TOGETHER</span></div><div className="side-section"><div className="section-row"><h3>Your people</h3><button onClick={() => openTab('chats')} className="text-link">View chats <ArrowRight size={14} /></button></div>{people.slice(0, 3).map(person => <button className="person-row" key={person.name} onClick={() => openChat(person.name, contacts.find(contact => contact.name === person.name)?.id ?? null)}><Avatar name={person.name} image={person.image} color={person.color} size="small" /><span><strong>{person.name}</strong><small>Say hello</small></span><MessageCircle size={17} /></button>)}</div></aside></div>
      </>}

      {tab === 'stories' && <div className="standard-page"><div className="page-heading"><div className="eyebrow">LIFE, AS IT HAPPENS <span className="eyebrow-line" /></div><h1>Daily <em>stories.</em></h1><p>A little window into the moments your people are making.</p></div><button className="primary-button story-create" onClick={() => setModal('story')}><Plus size={18} /> Add to your story</button><div className="story-grid">{dailyStories.map((story, index) => <button className={`story-tile story-tile-${index % 4}`} key={`${story.name}-${index}`} onClick={() => setSelectedStory(index)}>{story.image && <img src={story.image} alt="" />}<div className="story-tile-shade" /><div className="story-tile-top"><Avatar name={story.name} image={story.name === 'Olivia Park' ? photos.portrait : undefined} size="small" color="lilac" /><span>{story.name}</span></div><div className="story-tile-text">{story.text}</div></button>)}</div></div>}

      {tab === 'chats' && <div className="standard-page chat-page"><div className="page-heading"><div className="eyebrow">STAY CLOSE <span className="eyebrow-line" /></div><h1>Your <em>chats.</em></h1><p>Good conversations make everything a little brighter.</p></div><button className="primary-button" onClick={() => { setFindUsersQuery(''); setUserResults([]); setModal('find-users') }}><UserPlus size={17} /> {t('findUsers')}</button>{!authUser && <button className="secondary-button" onClick={() => { setAccountMode('login'); setModal('account') }}>{t('signIn')} to chat with your people</button>}<div className="chat-layout"><div className={`chat-list ${activeChat ? 'chat-list-hidden' : ''}`}><div className="search-box"><Search size={19} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchConversations')} aria-label={t('searchConversations')} /></div><div className="chat-list-title">{t('messages')} <span>{contacts.length}</span></div>{contacts.filter(person => person.name.toLowerCase().includes(search.toLowerCase())).map(person => <button className={`chat-row ${activeContactId === person.id ? 'selected' : ''}`} key={person.id} onClick={() => openChat(person.name, person.id)}><Avatar name={person.name} color="peach" /><span className="chat-row-copy"><strong>{person.name}</strong><small>{t('openConversation')}</small></span></button>)}{authUser && !contacts.length && <p className="chat-contact-empty">{t('peopleAppear')}</p>}</div><div className={`chat-thread ${activeChat ? 'thread-open' : ''}`}>{activeChat ? <><div className="thread-header"><button className="back-button" onClick={() => { if (recording) stopRecording(true); setVoiceDraft(null); setActiveChat(null); setActiveContactId(null) }} aria-label={t('backToChats')}><ArrowLeft size={20} /></button><Avatar name={activeChat} color="peach" size="small" /><div><strong>{activeChat}</strong><small>Here for the little moments</small></div></div><div className="thread-messages"><div className="day-divider">{t('today')}</div>{privateMessages.map(message => <div className={`message-bubble ${message.sender_user_id === authUser?.id ? 'mine' : ''}`} key={message.id}>{message.message_type === 'voice' && message.audio_path ? <VoicePlayer path={message.audio_path} durationMs={message.duration_ms || 0} /> : message.content}<small>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>{message.sender_user_id === authUser?.id && <button className="message-delete" onClick={() => setDeletingMessageId(message.id)} aria-label="Delete message"><Trash2 size={13} /></button>}</div>)}</div>{recording ? <div className="message-form voice-composer"><div className="voice-status"><strong>{recordingPaused ? t('pause') : t('recording')}</strong> · {voiceTime(recordingMs)}</div><button type="button" onClick={recordingPaused ? resumeRecording : pauseRecording} aria-label={recordingPaused ? t('resume') : t('pause')}>{recordingPaused ? <Play size={18} /> : <Pause size={18} />}</button><button type="button" onClick={() => stopRecording()} aria-label={t('finishRecording')}><Square size={18} /></button><button type="button" onClick={() => stopRecording(true)} aria-label={t('discard')}><Trash2 size={18} /></button></div> : voiceDraft ? <div className="message-form voice-composer"><div className="voice-preview"><button type="button" onClick={async () => { if (!previewAudioRef.current) return; if (voicePreviewPlaying) previewAudioRef.current.pause(); else await previewAudioRef.current.play() }} aria-label={t('preview')}>{voicePreviewPlaying ? <Pause size={18} /> : <Play size={18} />}</button><span>{t('preview')} · {voiceTime(voiceDraft.durationMs)}</span><audio ref={previewAudioRef} src={voicePreviewUrl} onPlay={() => setVoicePreviewPlaying(true)} onPause={() => setVoicePreviewPlaying(false)} onEnded={() => setVoicePreviewPlaying(false)} /></div><button type="button" onClick={discardVoiceDraft} aria-label={t('discard')}><Trash2 size={18} /></button><button type="button" onClick={sendRecording} disabled={chatBusy} aria-label={t('send')}><Send size={18} /></button></div> : <form className="message-form" onSubmit={e => { e.preventDefault(); sendMessage() }}><input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={t('typeMessage')} aria-label={t('typeMessage')} disabled={!chatId || chatBusy} /><button type="button" onClick={startRecording} disabled={!chatId || chatBusy} aria-label={t('voice')}><Mic size={18} /></button><button type="submit" disabled={!chatId || chatBusy} aria-label={t('sendMessage')}><Send size={18} /></button></form>}</> : <div className="chat-empty"><span><MessageCircle size={28} /></span><h3>{t('closer')}</h3><p>{t('chooseConversation')}</p></div>}</div></div></div>}

      {tab === 'create' && <div className="standard-page kids-page"><div className="page-heading"><div className="eyebrow">A LITTLE MAGIC, JUST FOR THEM <span className="eyebrow-line" /></div><h1>Kids’ <em>stories.</em></h1><p>Make them the hero of a one-of-a-kind bedtime adventure.</p></div>{generated ? <div className="generated-story"><button className="text-link" onClick={() => setGenerated(null)}><ArrowLeft size={16} /> Back to creator</button><div className="generated-cover"><span><Sparkles size={20} /> A STORY FOR {generated.child.toUpperCase()}</span><h2>{generated.title}</h2><Moon size={35} /></div><div className="story-body">{generated.text.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="generated-actions"><button className="primary-button" onClick={saveKidStory}><Bookmark size={17} /> Save this story</button><button className="secondary-button" onClick={() => { setGenerated(null); setChildName('') }}>Create another</button></div></div> : <><div className="kids-hero"><div className="kids-hero-content"><span className="kids-tag"><Sparkles size={14} /> MADE WITH IMAGINATION</span><h2>Every child deserves to be the hero.</h2><p>Dream up a story you can read together, tonight and for years to come.</p></div><div className="book-art" aria-hidden="true"><div className="art-star star-one">✦</div><div className="art-star star-two">✧</div><div className="art-moon" /><div className="art-book"><div className="book-left" /><div className="book-right" /><div className="book-spine" /></div></div></div><div className="creator-card"><div className="creator-heading"><span className="creator-icon"><WandSparkles size={20} /></span><div><h2>Let’s make a story</h2><p>Just a few details, and the adventure begins.</p></div></div><div className="form-grid"><label>Child’s name<input value={childName} onChange={e => setChildName(e.target.value)} placeholder="e.g. Charlie" /></label><label>Age range<select value={age} onChange={e => setAge(e.target.value)}><option>2–3 years</option><option>4–6 years</option><option>7–9 years</option></select></label><label className="full-field">What should the story be about?<input value={theme} onChange={e => setTheme(e.target.value)} placeholder="A magical adventure" /></label></div><div className="theme-suggestions"><span>TRY AN IDEA</span>{['A friendly dragon', 'Under the sea', 'A journey to the moon'].map(idea => <button className={theme === idea ? 'chosen' : ''} onClick={() => setTheme(idea)} key={idea}>{idea}</button>)}</div><button className="primary-button generate-button" onClick={makeStory} disabled={isGenerating}><Sparkles size={18} /> {isGenerating ? 'Creating their story...' : 'Create their story'} <ArrowRight size={17} /></button><p className="creator-note">A fresh adventure inspired by their name, age, and imagination.</p></div><div className="library-section"><div className="section-row"><div><h2>Your story shelf</h2><p>Every adventure you’ve saved, all in one place.</p></div><span className="library-count">{kidStories.length} STORIES</span></div>{kidStories.length ? <div className="library-list">{kidStories.map((story, index) => <div className="library-item" key={story.id ?? index}><button onClick={() => setGenerated(story)}><span className="library-book"><BookHeart size={23} /></span><span><strong>{story.title}</strong><small>For {story.child} · {story.date}</small></span><ChevronRight size={19} /></button><button className="library-delete" onClick={() => deleteKidStory(story, index)} aria-label={`Delete ${story.title}`}><Trash2 size={18} /></button></div>)}</div> : <div className="empty-library"><BookHeart size={25} /><span>Your next favorite bedtime story starts here.</span></div>}</div></>}</div>}

      {tab === 'profile' && <div className="standard-page profile-page"><div className="page-heading"><div className="eyebrow">A SPACE THAT’S YOURS <span className="eyebrow-line" /></div><h1>Your <em>profile.</em></h1><p>The little things that make you, you.</p></div><div className="profile-card"><div className={`profile-cover ${shown.coverUrl ? 'has-image' : ''}`} style={shown.coverUrl ? { backgroundImage: `url(${shown.coverUrl})` } : undefined}><div className="cover-orbit orbit-one" /><div className="cover-orbit orbit-two" /><span>THE GOOD IN EVERY DAY ✦</span></div><div className="profile-details"><div className="profile-avatar"><Avatar name={shown.name} image={shown.avatarUrl} size="large" color="sage" /></div><button className="edit-profile" onClick={() => { setDraftProfile(profile); setAvatarFile(null); setCoverFile(null); setModal('profile') }}><Pencil size={16} /> Edit profile</button><h2>{profile.name}</h2><div className="profile-handle">@{profile.handle}</div><p>{profile.bio}</p><div className="profile-stats"><div><strong>{posts.filter(p => p.author === profile.name).length}</strong><span>Posts</span></div><div><strong>{dailyStories.filter(s => s.name === profile.name).length}</strong><span>Stories</span></div><div><strong>{kidStories.length}</strong><span>Kids’ tales</span></div></div></div></div><div className="profile-posts"><div className="section-row"><div><h2>Your moments</h2><p>Little pieces of your story.</p></div><button className="text-link" onClick={() => setModal('post')}><Plus size={16} /> New post</button></div>{posts.filter(p => p.author === profile.name).length ? posts.filter(p => p.author === profile.name).map(p => <article className="profile-post" key={p.id}><span className="profile-post-date">{p.time}</span><p>{p.text}</p>{p.image && <img src={p.image} alt="Your shared moment" />}</article>) : <div className="profile-empty"><span><ImagePlus size={25} /></span><h3>Your story starts here.</h3><p>Share your first moment with your circle.</p><button className="secondary-button" onClick={() => setModal('post')}>Share a moment</button></div>}</div><button className="account-link" onClick={() => setModal('account')}><Mail size={18} /> {isMember ? 'Account details' : 'Create your account'} <ChevronRight size={18} /></button><button className="delete-account-link" onClick={() => setModal('delete')}>Delete account</button></div>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label={t('navLabel')}>{tabs.map(({ id, key, Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => openTab(id)}><Icon size={22} strokeWidth={tab === id ? 2.5 : 1.9} /><span>{t(key)}</span></button>)}</nav>
    {selectedStory !== null && dailyStories[selectedStory] && <div className="story-viewer" onClick={() => setSelectedStory(null)}><div className="viewer-panel" onClick={e => e.stopPropagation()}>{dailyStories[selectedStory].image && <img src={dailyStories[selectedStory].image} alt="Shared daily story" />}<div className="viewer-shade" /><div className="viewer-progress" /><div className="viewer-header"><Avatar name={dailyStories[selectedStory].name} size="small" color="sage" /><strong>{dailyStories[selectedStory].name}</strong><span>Today</span><div className="viewer-menu-wrap"><button onClick={() => setStoryMenu(open => !open)} aria-label="More story options" aria-expanded={storyMenu}><Ellipsis size={23} /></button>{storyMenu && <div className="post-menu viewer-menu" role="menu">{(dailyStories[selectedStory].ownerId === authUser?.id) && <button role="menuitem" className="danger" onClick={() => deleteStory(selectedStory)}><Trash2 size={16} /> Delete Story</button>}<button role="menuitem" onClick={() => shareStory(selectedStory)}><Share2 size={16} /> Share</button></div>}</div><button onClick={() => { setStoryMenu(false); setSelectedStory(null) }} aria-label="Close story"><X size={23} /></button></div><div className="viewer-content">{dailyStories[selectedStory].text}<div className="story-interactions"><button className={dailyStories[selectedStory].liked ? 'liked' : ''} onClick={() => void toggleStoryLike(selectedStory)}><Heart size={18} fill={dailyStories[selectedStory].liked ? 'currentColor' : 'none'} /> {dailyStories[selectedStory].likes || 0}</button><button onClick={() => setShowStoryComments(v => !v)}><MessageCircle size={18} /> {dailyStories[selectedStory].comments || 0}</button></div>{showStoryComments && <div className="story-comments">{(storyComments[String(dailyStories[selectedStory].id)] || []).map(comment => <div className="comment" key={comment.id}><strong>{comment.author}</strong><span>{comment.content}</span>{comment.userId === authUser?.id && <button onClick={() => void deleteStoryComment(String(dailyStories[selectedStory].id), comment)}><Trash2 size={13}/></button>}</div>)}<form onSubmit={e => { e.preventDefault(); const input=e.currentTarget.elements.namedItem('storyComment') as HTMLInputElement; void addStoryComment(selectedStory, input.value); input.value='' }}><input name="storyComment" placeholder="Write a comment..." /><button type="submit"><Send size={16}/></button></form></div>}</div><button className="viewer-prev" onClick={() => { setStoryMenu(false); setSelectedStory((selectedStory - 1 + dailyStories.length) % dailyStories.length) }} aria-label="Previous story"><ChevronLeft size={24} /></button><button className="viewer-next" onClick={() => setSelectedStory((selectedStory + 1) % dailyStories.length)} aria-label="Next story"><ChevronRight size={24} /></button></div></div>}
    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="modal-panel"><div className="modal-top"><h2>{modal === 'post' ? t('shareMoment') : modal === 'story' ? t('addStory') : modal === 'profile' ? t('editProfile') : modal === 'notifications' ? t('notifications') : modal === 'delete' ? t('deleteAccount') : isMember ? t('account') : 'Join MingleNest'}</h2><button onClick={() => setModal(null)} aria-label={t('close')}><X size={21} /></button></div>{modal === 'post' && <div className="modal-content"><div className="modal-person"><Avatar name={profile.name} color="sage" size="small" /><span><strong>{profile.name}</strong><small>{t('yourCircle')}</small></span></div><textarea autoFocus value={postText} onChange={e => setPostText(e.target.value)} placeholder={language==='fr' ? 'Quel petit moment souhaitez-vous partager ?' : language==='es' ? '¿Qué pequeño momento quieres compartir?' : language==='de' ? 'Welchen kleinen Moment möchtest du teilen?' : language==='pt' ? 'Que pequeno momento você quer compartilhar?' : language==='it' ? 'Quale piccolo momento vuoi condividere?' : language==='ar' ? 'ما اللحظة الصغيرة التي تريد مشاركتها؟' : 'What’s a little moment you’d like to share?'} rows={5} /><label className={`story-picker ${postImage ? 'has-image' : ''}`} style={postImage ? { backgroundImage: `url(${postImage})` } : undefined}><input type="file" accept="image/*" onChange={pickPostImage} aria-label={t('choosePhoto')} /><span className="media-badge"><ImagePlus size={15} /> {postImage ? t('changePhoto') : t('addPhoto')}</span></label><button className="primary-button modal-submit" onClick={publishPost} disabled={!postText.trim() || savingPost}>{savingPost ? t('sharing') : t('shareMoment')} <ArrowRight size={17} /></button></div>}{modal === 'story' && <div className="modal-content"><p className="modal-description">{language==='fr' ? 'Un petit aperçu de votre journée, partagé avec vos proches.' : language==='es' ? 'Un pequeño vistazo a tu día, compartido con tus personas.' : language==='de' ? 'Ein kleiner Einblick in deinen Tag, mit deinen Menschen geteilt.' : language==='pt' ? 'Um pequeno vislumbre do seu dia, compartilhado com seus amigos.' : language==='it' ? 'Un piccolo scorcio della tua giornata, condiviso con le tue persone.' : language==='ar' ? 'لمحة صغيرة من يومك تشاركها مع الأشخاص المقربين منك.' : 'A small glimpse into your day, shared with your people.'}</p><textarea autoFocus value={storyText} onChange={e => setStoryText(e.target.value)} placeholder={t('typeStory')} rows={4} /><label className={`story-picker ${storyImage ? 'has-image' : ''}`} style={storyImage ? { backgroundImage: `url(${storyImage})` } : undefined}><input type="file" accept="image/*" onChange={pickStoryImage} aria-label={t('choosePhoto')} /><span className="media-badge"><ImagePlus size={15} /> {storyImage ? 'Change photo' : 'Choose a photo'}</span></label><button className="primary-button modal-submit" onClick={publishStory} disabled={(!storyText.trim() && !storyFile) || savingStory}>{savingStory ? t('sharing') : t('shareStory')} <ArrowRight size={17} /></button></div>}{modal === 'profile' && <div className="modal-content profile-form"><div className="media-edit"><label className={`cover-edit ${draftProfile.coverUrl ? 'has-image' : ''}`} style={draftProfile.coverUrl ? { backgroundImage: `url(${draftProfile.coverUrl})` } : undefined}><input type="file" accept="image/*" onChange={e => pickImage(e, 'cover')} aria-label="Choose cover photo" /><span className="media-badge"><Camera size={15} /> {draftProfile.coverUrl ? t('changeCover') : t('addCover')}</span></label><label className="avatar-edit"><input type="file" accept="image/*" onChange={e => pickImage(e, 'avatar')} aria-label={t('choosePhoto')} /><Avatar name={draftProfile.name || '?'} image={draftProfile.avatarUrl} size="large" color="sage" /><span className="avatar-camera"><Camera size={14} /></span></label></div><label className="input-label">{t('yourName')}<input value={draftProfile.name} onChange={e => setDraftProfile({ ...draftProfile, name: e.target.value })} /></label><label className="input-label">{t('username')}<input value={draftProfile.handle} onChange={e => setDraftProfile({ ...draftProfile, handle: e.target.value.replace(/\s/g, '').toLowerCase() })} /></label><label className="input-label">A little about you<textarea rows={3} value={draftProfile.bio} onChange={e => setDraftProfile({ ...draftProfile, bio: e.target.value })} /></label><button className="primary-button modal-submit" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? t('saving') : t('saveChanges')} <Check size={17} /></button></div>}{modal === 'find-users' && <div className="modal-content"><div className="search-box" style={{margin:'0 0 18px'}}><Search size={18} /><input autoFocus value={findUsersQuery} onChange={e => setFindUsersQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void findUsers() }} placeholder={t('searchUsers')} /></div><button className="primary-button modal-submit" style={{marginTop:0}} onClick={() => void findUsers()}>{t('findUsers')}</button><div className="user-search-results">{userResults.map(person => <button key={person.id} className="person-row" onClick={() => { setModal(null); openChat(person.name, person.id) }}><Avatar name={person.name} size="small" /><span><strong>{person.name}</strong><small>@{person.name.toLowerCase().replace(/\s+/g,'')}</small></span><MessageCircle size={17} /></button>)}{findUsersQuery.trim() && !userResults.length && <p className="chat-contact-empty">{t('noUsers')}</p>}</div></div>}{modal === 'settings' && <div className="modal-content"><div className="settings-language"><Globe2 size={20} /><div><strong>{t('language')}</strong><small>{t('chooseLanguage')}</small></div></div><div className="language-grid" style={{display:'flex',flexDirection:'column',gap:10,width:'100%'}}>{(Object.entries(LANGUAGES) as [Language,string][]).map(([code,label]) => <button key={code} className={language === code ? 'chosen' : ''} onClick={() => chooseLanguage(code)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',boxSizing:'border-box'}}>{label}{language === code && <Check size={15} />}</button>)}</div></div>}{modal === 'notifications' && <div className="modal-content notification-content"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:14}}><div style={{display:'flex',alignItems:'center',gap:10}}><div className="notification-icon"><Bell size={23} /></div><div><h3 style={{margin:0}}>{t('notifications')}</h3><p style={{margin:'3px 0 0'}}>{unreadNotifications ? `${unreadNotifications} ${t('unread')}` : t('allCaughtUp')}</p></div></div>{unreadNotifications > 0 && <button className="secondary-button" style={{padding:'8px 10px'}} onClick={() => void markAllNotificationsRead()}>{t('markAllRead')}</button>}</div>{notifications.length ? <div style={{display:'grid',gap:8,maxHeight:430,overflow:'auto'}}>{notifications.map(item => <button key={item.id} onClick={() => void openNotification(item)} style={{border:'1px solid var(--line)',background:item.read_at ? '#fff' : '#E8F8E8',borderRadius:12,padding:'12px',textAlign:'left',display:'flex',gap:10,alignItems:'flex-start',cursor:'pointer'}}><Bell size={18} style={{color:'var(--forest)',marginTop:2,flex:'0 0 auto'}} /><span style={{display:'grid',gap:4}}><strong>{item.message}</strong><small style={{color:'var(--muted)'}}>{new Date(item.created_at).toLocaleString()}</small></span>{!item.read_at && <span style={{width:8,height:8,borderRadius:'50%',background:'var(--forest)',marginLeft:'auto',marginTop:5}} />}</button>)}</div> : <p>{t('noNotifications')}</p>}</div>}{modal === 'delete' && <div className="modal-content delete-content"><h3>{t('deleteAccount')}</h3><p>Deleting your account removes your profile, posts, stories and saved Kids’ stories. You’ll be taken to a short request form to confirm your details. Nothing is deleted until the request is processed.</p><button className="primary-button danger-button modal-submit" onClick={() => { window.open('https://docs.google.com/forms/d/e/1FAIpQLSet39JW9olvDYwSEqF9C6Vyx8obVpNaUU9Ahsqxbm--jOC62g/viewform?usp=dialog', '_blank', 'noopener,noreferrer'); setModal(null) }}>{t('requestDeletion')}</button><button className="secondary-button modal-submit" onClick={() => setModal(null)}>{t('keepAccount')}</button></div>}{modal === 'account' && <div className="modal-content">{authUser ? <div className="account-success"><span><Check size={25} /></span><h3>You’re part of the nest.</h3><p>Signed in as {authUser.email}. Your private chats are available across devices.</p><button className="secondary-button" onClick={async () => { await supabase.auth.signOut(); setIsMember(false); setModal(null); setToast('Signed out of this device') }}>{t('signOut')}</button></div> : <><p className="modal-description">A cozy space for your people, your moments, and your stories.</p><div className="account-switch"><button className={accountMode === 'join' ? 'active' : ''} onClick={() => setAccountMode('join')}>{t('createAccount')}</button><button className={accountMode === 'login' ? 'active' : ''} onClick={() => setAccountMode('login')}>{t('signIn')}</button></div><form className="account-form" onSubmit={submitAccount}>{accountMode === 'join' && <label className="input-label">{t('yourName')}<input required value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Alex Morgan" /></label>}<label className="input-label">{t('email')}<input type="email" required value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="you@example.com" /></label><label className="input-label">{t('password')}<input type="password" required minLength={6} value={accountPassword} onChange={e => setAccountPassword(e.target.value)} placeholder="At least 6 characters" /></label><button className="primary-button modal-submit" type="submit">{accountMode === 'join' ? t('joinNest') : t('signIn')} <ArrowRight size={17} /></button></form><p className="local-note">{t('accountSaved')}</p></>}</div>}</div></div>}
    {deletingMessageId && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setDeletingMessageId(null) }}><div className="modal-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-message-title"><div className="modal-top"><h2 id="delete-message-title">Delete this message?</h2></div><div className="modal-content" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}><button className="secondary-button" onClick={() => setDeletingMessageId(null)}>{t('cancel')}</button><button className="primary-button danger-button" onClick={() => { const message = privateMessages.find(item => item.id === deletingMessageId); if (message) void deletePrivateMessage(message) }} >{t('delete')}</button></div></div></div>}
    {toast && <div className="toast"><Check size={17} />{toast}</div>}
  </div>
}

export default App
