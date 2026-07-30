import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Station = Tables<"stations">;
export type Train = Tables<"trains">;
export type TrainStop = Tables<"train_stops">;
export type Post = Tables<"posts">;
export type Report = Tables<"reports">;
export type Suggestion = Tables<"suggestions">;
export type Audio = Tables<"audios">;
export type Marquee = Tables<"marquees">;
export type SplashSlide = Tables<"splash_slides">;
export type Section = Tables<"sections">;
export type LiveNotice = Tables<"live_notices">;
export type LiveBoardSettings = Tables<"live_board_settings">;

export type TrainWithStops = Train & { stops: TrainStop[] };

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export async function fetchStations(): Promise<Station[]> {
  return unwrap(await supabase.from("stations").select("*").order("sort_order"));
}

export async function fetchTrains(includeHidden = false): Promise<TrainWithStops[]> {
  let query = supabase.from("trains").select("*").order("sort_order");
  if (!includeHidden) query = query.eq("is_visible", true);
  const trains = unwrap<Train[]>(await query);
  const stops = unwrap<TrainStop[]>(
    await supabase.from("train_stops").select("*").order("stop_order"),
  );
  return trains.map((t) => ({ ...t, stops: stops.filter((s) => s.train_id === t.id) }));
}

export async function fetchPosts(): Promise<Post[]> {
  return unwrap(
    await supabase.from("posts").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
  );
}

export async function fetchReports(): Promise<Report[]> {
  return unwrap(
    await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(80),
  );
}

export async function fetchSuggestions(): Promise<Suggestion[]> {
  return unwrap(
    await supabase.from("suggestions").select("*").order("created_at", { ascending: false }).limit(80),
  );
}

export async function fetchAudios(): Promise<Audio[]> {
  return unwrap(await supabase.from("audios").select("*").order("sort_order"));
}

export async function fetchMarquees(): Promise<Marquee[]> {
  return unwrap(await supabase.from("marquees").select("*").order("sort_order"));
}

export async function fetchSplashSlides(): Promise<SplashSlide[]> {
  return unwrap(await supabase.from("splash_slides").select("*").order("sort_order"));
}

export async function fetchSections(): Promise<Section[]> {
  return unwrap(await supabase.from("sections").select("*").order("sort_order"));
}

export async function fetchViewerCount(): Promise<number> {
  const { data } = await supabase.from("viewer_counter").select("count").eq("id", 1).maybeSingle();
  return Number(data?.count ?? 0);
}

export async function bumpViewers(): Promise<number> {
  const { data, error } = await supabase.rpc("bump_viewers", { _by: 5 });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/** Everything the app needs, in one offline-cacheable payload. */
export type AppBundle = {
  stations: Station[];
  trains: TrainWithStops[];
  posts: Post[];
  reports: Report[];
  suggestions: Suggestion[];
  audios: Audio[];
  marquees: Marquee[];
  splash: SplashSlide[];
  sections: Section[];
  fetchedAt: string;
};

export async function fetchAppBundle(): Promise<AppBundle> {
  const [stations, trains, posts, reports, suggestions, audios, marquees, splash, sections] =
    await Promise.all([
      fetchStations(),
      fetchTrains(),
      fetchPosts(),
      fetchReports(),
      fetchSuggestions(),
      fetchAudios(),
      fetchMarquees(),
      fetchSplashSlides(),
      fetchSections(),
    ]);
  return {
    stations,
    trains,
    posts,
    reports,
    suggestions,
    audios,
    marquees,
    splash,
    sections,
    fetchedAt: new Date().toISOString(),
  };
}
