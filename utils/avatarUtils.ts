/**
 * Returns the avatar URL directly since all images are now stored as public URLs
 * @param avatarUrl - The public URL from the database
 * @returns string | null - The public URL or null if not provided
 */
export const getAvatarUrl = (avatarUrl: string | null): string | null => {
  return avatarUrl; // Public URLs can be used directly
};

/**
 * Returns avatar URLs directly for multiple avatars
 * @param avatarUrls - Array of avatar URLs
 * @returns {[key: string]: string} - Object mapping original URLs to themselves
 */
export const getAvatarUrls = (
  avatarUrls: (string | null)[]
): { [key: string]: string } => {
  const urls: { [key: string]: string } = {};

  avatarUrls.forEach((url) => {
    if (url) {
      urls[url] = url; // Public URLs can be used directly
    }
  });

  return urls;
};

/**
 * Returns avatar URLs for group members
 * @param members - Array of group members with avatar_url
 * @returns {[memberId: string]: string} - Object mapping member IDs to public URLs
 */
export const getMemberAvatarUrls = (
  members: Array<{ user_id: string; avatar_url: string | null }>
): { [memberId: string]: string } => {
  const urls: { [memberId: string]: string } = {};

  members.forEach((member) => {
    if (member.avatar_url) {
      urls[member.user_id] = member.avatar_url; // Public URLs can be used directly
    }
  });

  return urls;
};

// Legacy function names for backward compatibility - these just return public URLs directly
export const createSignedUrlForAvatar = getAvatarUrl;
export const createSignedUrlsForAvatars = async (
  avatarUrls: (string | null)[]
): Promise<{ [key: string]: string }> => {
  return getAvatarUrls(avatarUrls);
};
export const generateMemberSignedUrls = async (
  members: Array<{ user_id: string; avatar_url: string | null }>
): Promise<{ [memberId: string]: string }> => {
  return getMemberAvatarUrls(members);
};
