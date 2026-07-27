import { supabase } from "@/integrations/supabase/client";

export const ADMIN_USERNAME = "Mohnyin@com";
const RESERVED_EMAIL = "mohnyin_at_com@mohnyin-express.app";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase().replace(/@/g, "_at_")}@mohnyin-express.app`;
}

export async function adminSignIn(username: string, password: string): Promise<string | null> {
  const email = usernameToEmail(username);

  let result = await supabase.auth.signInWithPassword({ email, password });

  if (result.error && email === RESERVED_EMAIL) {
    // First ever sign-in: create the reserved admin account, then retry.
    const signUp = await supabase.auth.signUp({ email, password });
    if (!signUp.error) {
      result = await supabase.auth.signInWithPassword({ email, password });
    }
  }

  if (result.error) return "အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မှားနေပါသည်။";

  const { data } = await supabase.from("user_roles").select("role").eq("role", "admin").maybeSingle();
  if (!data) {
    await supabase.auth.signOut();
    return "ဤအကောင့်တွင် Admin ခွင့်ပြုချက် မရှိပါ။";
  }
  return null;
}

export async function isAdminSession(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { data } = await supabase.from("user_roles").select("role").eq("role", "admin").maybeSingle();
  return Boolean(data);
}

export async function adminSignOut() {
  await supabase.auth.signOut();
}

/** Uploads to the private media bucket and returns a long-lived signed URL. */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data, error: signErr } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signErr || !data) throw new Error(signErr?.message ?? "URL မရရှိပါ");
  return data.signedUrl;
}
