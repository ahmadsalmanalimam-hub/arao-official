import { supabase } from '../lib/supabase';
import { StoryItem } from '../components/stories/StoriesBar';

export interface UserStoryRecord {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
  username?: string;
  user_avatar?: string;
  display_name?: string;
  caption?: string;
}

export interface UserLiveRecord {
  id: string;
  user_id: string;
  is_live: boolean;
  started_at: string;
  ended_at?: string;
  username: string;
  user_avatar?: string;
  title?: string;
  viewer_count?: number;
}

/**
 * Ensure storage bucket exists if possible
 */
async function ensureBucket(bucketName: string) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets && !buckets.some(b => b.name === bucketName)) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }
  } catch (err) {
    // Non-blocking catch
  }
}

/**
 * Upload story media to Supabase storage bucket "stories"
 */
export async function uploadStoryMedia(
  fileOrBlob: File | Blob,
  userId: string,
  mediaType: 'image' | 'video'
): Promise<string> {
  const ext = mediaType === 'video' ? 'mp4' : 'jpg';
  const fileName = `story_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const filePath = `${userId}/${fileName}`;

  try {
    await ensureBucket('stories');
    const { error: uploadError } = await supabase.storage
      .from('stories')
      .upload(filePath, fileOrBlob, {
        contentType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        upsert: true
      });

    if (!uploadError) {
      const { data: publicData } = supabase.storage.from('stories').getPublicUrl(filePath);
      if (publicData?.publicUrl) {
        return publicData.publicUrl;
      }
    } else {
      console.warn('Storage bucket "stories" upload fallback, trying "photos"/"reels":', uploadError);
      const fallbackBucket = mediaType === 'video' ? 'reels' : 'photos';
      const { error: fbError } = await supabase.storage
        .from(fallbackBucket)
        .upload(filePath, fileOrBlob, { upsert: true });
      if (!fbError) {
        const { data: fbData } = supabase.storage.from(fallbackBucket).getPublicUrl(filePath);
        if (fbData?.publicUrl) return fbData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Supabase upload error, will use object URL fallback:', err);
  }

  // Fallback to data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(URL.createObjectURL(fileOrBlob));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Insert new story into `stories` table and update local cache
 */
export async function createStory(params: {
  userId: string;
  username: string;
  userAvatar?: string;
  displayName?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
}): Promise<UserStoryRecord> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiry
  const storyId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const storyRecord: UserStoryRecord = {
    id: storyId,
    user_id: params.userId,
    media_url: params.mediaUrl,
    media_type: params.mediaType,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    username: params.username,
    user_avatar: params.userAvatar,
    display_name: params.displayName || params.username,
    caption: params.caption || 'My 24h Story'
  };

  // Try insert into Supabase table "stories"
  try {
    await supabase.from('stories').insert([
      {
        id: storyRecord.id,
        user_id: storyRecord.user_id,
        media_url: storyRecord.media_url,
        created_at: storyRecord.created_at,
        expires_at: storyRecord.expires_at
      }
    ]);
  } catch (err) {
    console.warn('[Supabase stories table insert fallback]:', err);
  }

  // Persist locally for instant story ring and viewing
  try {
    const existing: UserStoryRecord[] = JSON.parse(localStorage.getItem('arao_user_stories') || '[]');
    // Filter out expired stories (> 24h)
    const validStories = existing.filter(s => new Date(s.expires_at) > new Date());
    const updated = [storyRecord, ...validStories];
    localStorage.setItem('arao_user_stories', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  // Dispatch custom event to notify StoriesBar and feed
  window.dispatchEvent(new CustomEvent('arao_story_added', { detail: storyRecord }));

  return storyRecord;
}

/**
 * Get active (unexpired) stories from Supabase + localStorage
 */
export async function getActiveStories(): Promise<StoryItem[]> {
  const nowIso = new Date().toISOString();
  let serverStories: StoryItem[] = [];

  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      serverStories = data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        username: d.username || 'creator',
        userAvatar: d.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
        displayName: d.display_name || d.username || 'Creator',
        mediaUrl: d.media_url,
        mediaType: d.media_type || (d.media_url.includes('.mp4') || d.media_url.includes('.webm') ? 'video' : 'image'),
        caption: d.caption || '24h Story',
        timestamp: 'Just now'
      }));
    }
  } catch (err) {
    console.warn('Stories table fetch error:', err);
  }

  // Merge with local stories
  try {
    const local: UserStoryRecord[] = JSON.parse(localStorage.getItem('arao_user_stories') || '[]');
    const validLocal = local.filter(s => new Date(s.expires_at) > new Date());
    const localItems: StoryItem[] = validLocal.map(s => ({
      id: s.id,
      userId: s.user_id,
      username: s.username || 'you',
      userAvatar: s.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
      displayName: s.display_name || 'You',
      mediaUrl: s.media_url,
      mediaType: s.media_type,
      caption: s.caption || '24h Story',
      timestamp: 'Recently'
    }));

    // Deduplicate by ID
    const merged = [...localItems, ...serverStories];
    const seen = new Set<string>();
    return merged.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  } catch {
    return serverStories;
  }
}

/**
 * Check if current user has an active story
 */
export function hasUserActiveStory(userId?: string): boolean {
  if (!userId) return false;
  try {
    const local: UserStoryRecord[] = JSON.parse(localStorage.getItem('arao_user_stories') || '[]');
    return local.some(s => s.user_id === userId && new Date(s.expires_at) > new Date());
  } catch {
    return false;
  }
}

/**
 * Start a live stream session in `lives` table
 */
export async function startLiveStream(params: {
  userId: string;
  username: string;
  userAvatar?: string;
  title?: string;
}): Promise<UserLiveRecord> {
  const liveId = `live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const liveRecord: UserLiveRecord = {
    id: liveId,
    user_id: params.userId,
    is_live: true,
    started_at: now,
    username: params.username,
    user_avatar: params.userAvatar,
    title: params.title || `${params.username}'s Live Broadcast`,
    viewer_count: 0
  };

  try {
    await supabase.from('lives').insert([
      {
        id: liveRecord.id,
        user_id: liveRecord.user_id,
        is_live: true,
        started_at: liveRecord.started_at
      }
    ]);
  } catch (err) {
    console.warn('[Supabase lives table insert fallback]:', err);
  }

  try {
    localStorage.setItem('arao_current_live', JSON.stringify(liveRecord));
    const activeLives = JSON.parse(localStorage.getItem('arao_active_lives') || '[]');
    localStorage.setItem('arao_active_lives', JSON.stringify([liveRecord, ...activeLives]));
  } catch (e) {
    console.error(e);
  }

  window.dispatchEvent(new CustomEvent('arao_live_status_changed', { detail: { isLive: true, live: liveRecord } }));

  return liveRecord;
}

/**
 * End a live stream session
 */
export async function endLiveStream(liveId: string, userId: string): Promise<void> {
  const endedAt = new Date().toISOString();

  try {
    await supabase
      .from('lives')
      .update({
        is_live: false,
        ended_at: endedAt
      })
      .eq('id', liveId);
  } catch (err) {
    console.warn('[Supabase lives table update fallback]:', err);
  }

  try {
    localStorage.removeItem('arao_current_live');
    const activeLives: UserLiveRecord[] = JSON.parse(localStorage.getItem('arao_active_lives') || '[]');
    const updated = activeLives.filter(l => l.id !== liveId);
    localStorage.setItem('arao_active_lives', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  window.dispatchEvent(new CustomEvent('arao_live_status_changed', { detail: { isLive: false, liveId } }));
}
