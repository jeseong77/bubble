import { supabase } from "@/lib/supabase";

/**
 * Creates a signed URL for an avatar image
 * @param avatarUrl - The public URL from the database
 * @param expirySeconds - How long the signed URL should be valid (default: 1 hour)
 * @returns Promise<string | null> - The signed URL or null if failed
 */
export const createSignedUrlForAvatar = async (
  avatarUrl: string | null,
  expirySeconds: number = 3600
): Promise<string | null> => {
  if (!avatarUrl) return null;

  try {
    // Extract file path from public URL
    const urlParts = avatarUrl.split("/user-images/");
    const filePath = urlParts.length > 1 ? urlParts[1] : null;

    if (!filePath) {
      console.log("[avatarUtils] 파일 경로를 추출할 수 없습니다:", avatarUrl);
      return null;
    }

    const { data, error } = await supabase.storage
      .from("user-images")
      .createSignedUrl(filePath, expirySeconds);

    if (error) {
      console.error("[avatarUtils] Signed URL 생성 실패:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("[avatarUtils] Signed URL 생성 중 예외:", error);
    return null;
  }
};

/**
 * Creates signed URLs for multiple avatars in parallel
 * @param avatarUrls - Array of avatar URLs
 * @param expirySeconds - How long the signed URLs should be valid
 * @returns Promise<{[key: string]: string}> - Object mapping original URLs to signed URLs
 */
export const createSignedUrlsForAvatars = async (
  avatarUrls: (string | null)[],
  expirySeconds: number = 3600
): Promise<{ [key: string]: string }> => {
  const signedUrls: { [key: string]: string } = {};

  const promises = avatarUrls.map(async (url) => {
    if (!url) return;
    const signedUrl = await createSignedUrlForAvatar(url, expirySeconds);
    if (signedUrl) {
      signedUrls[url] = signedUrl;
    }
  });

  await Promise.all(promises);
  return signedUrls;
};

/**
 * Pre-generates signed URLs for group members
 * @param members - Array of group members with avatar_url
 * @returns Promise<{[memberId: string]: string}> - Object mapping member IDs to signed URLs
 */
export const generateMemberSignedUrls = async (
  members: Array<{ user_id: string; avatar_url: string | null }>
): Promise<{ [memberId: string]: string }> => {
  const signedUrls: { [memberId: string]: string } = {};

  const promises = members.map(async (member) => {
    if (member.avatar_url) {
      const signedUrl = await createSignedUrlForAvatar(member.avatar_url);
      if (signedUrl) {
        signedUrls[member.user_id] = signedUrl;
      }
    }
  });

  await Promise.all(promises);
  return signedUrls;
};
