import { supabase } from './supabase'

export type ChatContact = { id: string; name: string }
export type PrivateMessage = { id: string; conversation_id: string; sender_user_id: string; content: string | null; message_type: 'text' | 'voice'; audio_path: string | null; duration_ms: number | null; created_at: string }
export const VOICE_BUCKET = 'voice-messages'

export async function listChatContacts(myId: string): Promise<ChatContact[]> {
  const { data, error } = await supabase.from('chat_users').select('id,display_name').neq('id', myId).order('display_name')
  if (error) throw error
  return (data || []).map(person => ({ id: person.id, name: person.display_name }))
}
export async function getPrivateConversation(otherId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_private_chat', { p_other: otherId })
  if (error) throw error
  return data as string
}
export async function readPrivateMessages(conversationId: string): Promise<PrivateMessage[]> {
  const { data, error } = await supabase.from('messages').select('id,conversation_id,sender_user_id,content,message_type,audio_path,duration_ms,created_at').eq('conversation_id', conversationId).order('created_at')
  if (error) throw error
  return (data || []) as PrivateMessage[]
}
export async function sendPrivateText(conversationId: string, senderId: string, content: string): Promise<PrivateMessage> {
  const { data, error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_user_id: senderId, message_type: 'text', content: content.trim().normalize('NFC') }).select('id,conversation_id,sender_user_id,content,message_type,audio_path,duration_ms,created_at').single()
  if (error) throw error
  return data as PrivateMessage
}
export async function sendPrivateVoice(conversationId: string, senderId: string, blob: Blob, durationMs: number) {
  const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  const path = `${conversationId}/${senderId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from(VOICE_BUCKET).upload(path, blob, { contentType: blob.type, upsert: false })
  if (uploadError) throw uploadError
  const { data, error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_user_id: senderId, message_type: 'voice', audio_path: path, duration_ms: durationMs }).select('id,conversation_id,sender_user_id,content,message_type,audio_path,duration_ms,created_at').single()
  if (error) {
    await supabase.storage.from(VOICE_BUCKET).remove([path])
    throw error
  }
  return data as PrivateMessage
}
export async function removePrivateMessage(message: PrivateMessage, myId: string) {
  if (message.sender_user_id !== myId) throw new Error('Only your own messages can be deleted')
  // RLS enforces both sender identity and conversation membership, even if the client is modified.
  const { data, error } = await supabase.from('messages').delete().eq('id', message.id).eq('sender_user_id', myId).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Message not found or you cannot delete it')
  if (message.audio_path) {
    const { error: audioError } = await supabase.storage.from(VOICE_BUCKET).remove([message.audio_path])
    if (audioError) throw new Error('Message deleted, but the recording could not be removed. Please contact support.')
  }
}
export async function privateAudioUrl(path: string) {
  // Download through the authenticated Storage policy instead of issuing a reusable
  // signed URL that would remain valid after the sender deletes the message.
  const { data, error } = await supabase.storage.from(VOICE_BUCKET).download(path)
  if (error) throw error
  return URL.createObjectURL(data)
}
