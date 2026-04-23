import { Header } from "@/components/layout/header";
import { PromptStudioClient } from "@/components/prompt-studio/prompt-studio-client";
import { createClient } from "@/lib/supabase/server";
import { getPromptStudioSettingsFromUser, pickPromptSettings } from "@/lib/prompt-studio";

export default async function PromptStudioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: promptSettings } = await supabase
    .from("prompt_studio_settings")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  const initialPrompts = pickPromptSettings(promptSettings, getPromptStudioSettingsFromUser(user));

  return (
    <div>
      <Header
        title="Prompt Studio"
        subtitle="Edit the default AI prompts used for new emails and drop in variables where needed"
      />
      <PromptStudioClient initialPrompts={initialPrompts} />
    </div>
  );
}
