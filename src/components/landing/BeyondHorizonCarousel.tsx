"use client";

import Image from "next/image";
import useSWR from "swr";
import { useEffect, useState } from "react";
import styles from "./BeyondHorizonCarousel.module.css";

const NASA_SEARCH_URL = "https://images-api.nasa.gov/search";
const ROTATION_INTERVAL_MS = 5_600;

const FEATURED_ASSETS = [
  { category: "Apollo 11", nasaId: "as11-40-5874" },
  { category: "Voyager missions", nasaId: "PIA23645" },
  { category: "Perseverance", nasaId: "PIA23722" },
  { category: "James Webb", nasaId: "PIA26703" },
] as const;

interface NasaMetadata {
  nasa_id?: string;
  title?: string;
  description?: string;
  center?: string;
  photographer?: string;
  secondary_creator?: string;
  credit?: string;
  date_created?: string;
}

interface NasaImageLink {
  href?: string;
  rel?: string;
  render?: string;
  width?: number;
}

interface NasaSearchItem {
  data?: NasaMetadata[];
  links?: NasaImageLink[];
  href?: string;
}

interface NasaSearchResponse {
  collection?: { items?: NasaSearchItem[] };
}

interface InspirationStory {
  category: string;
  nasaId: string;
  title: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  credit: string;
  dateCreated?: string;
}

async function fetchFeaturedStory(featured: (typeof FEATURED_ASSETS)[number]): Promise<InspirationStory> {
  const url = new URL(NASA_SEARCH_URL);
  url.searchParams.set("q", featured.nasaId);
  url.searchParams.set("media_type", "image");
  url.searchParams.set("page_size", "10");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`NASA image search returned ${response.status}.`);

  const payload = (await response.json()) as NasaSearchResponse;
  const item = payload.collection?.items?.find((candidate) => candidate.data?.[0]?.nasa_id === featured.nasaId);
  const metadata = item?.data?.[0];
  const imageLinks = item?.links?.filter((link) => link.render === "image" && typeof link.href === "string") ?? [];
  const preferredImage = imageLinks
    .filter((link) => link.rel === "alternate" && (link.width === undefined || link.width <= 1440))
    .sort((first, second) => (second.width ?? 0) - (first.width ?? 0))[0];
  const image = preferredImage ?? imageLinks.find((link) => link.rel === "preview") ?? imageLinks[0];

  if (!metadata?.nasa_id || !metadata.title || !metadata.description || !item?.href || !image?.href) {
    throw new Error(`NASA metadata is incomplete for ${featured.nasaId}.`);
  }

  const credit = metadata.photographer
    ?? metadata.secondary_creator
    ?? metadata.credit
    ?? (metadata.center ? `NASA / ${metadata.center}` : "Credit not supplied in NASA metadata");

  return {
    category: featured.category,
    nasaId: metadata.nasa_id,
    title: metadata.title,
    description: metadata.description,
    imageUrl: image.href,
    sourceUrl: item.href,
    credit,
    dateCreated: metadata.date_created,
  };
}

async function fetchFeaturedStories(): Promise<readonly InspirationStory[]> {
  const results = await Promise.allSettled(FEATURED_ASSETS.map(fetchFeaturedStory));
  const stories = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  if (stories.length === 0) throw new Error("NASA's Image and Video Library is unavailable.");
  return stories;
}

export function BeyondHorizonCarousel() {
  const { data: stories, error, isLoading, mutate } = useSWR<readonly InspirationStory[]>(
    "beyond-horizon-nasa-stories",
    fetchFeaturedStories,
    { dedupingInterval: 3_600_000, revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (!stories || stories.length < 2 || !autoplayEnabled || isHovered || isFocused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % stories.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [autoplayEnabled, isFocused, isHovered, stories]);

  const activeStory = stories?.[activeIndex] ?? stories?.[0];
  const activeStoryIndex = activeStory && stories ? stories.indexOf(activeStory) : 0;

  return (
    <section
      aria-labelledby="beyond-horizon-title"
      className="relative overflow-hidden border-t border-horizon/50 bg-hull/45 px-6 py-14 md:px-10 md:py-16 lg:px-14"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_84%_0%,color-mix(in_oklab,var(--limen-ion)_8%,transparent),transparent_66%)]" />
      <div className="relative mx-auto w-full max-w-[1180px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-ion">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-ion shadow-[0_0_12px_var(--limen-ion)]" />
              NASA inspiration corner
            </p>
            <h2 id="beyond-horizon-title" className="mt-3 text-display-md font-semibold tracking-tight text-glow">
              Beyond the Horizon
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-glow-muted">
              The people, images, and missions that carry human curiosity farther.
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-glow-faint">
            NASA Image and Video Library
          </p>
        </div>

        <div
          className="mt-7"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocusCapture={() => setIsFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocused(false);
          }}
          role="region"
          aria-roledescription="carousel"
          aria-label="NASA mission stories"
        >
          {isLoading && (
            <div className="flex min-h-64 items-center justify-center rounded-panel border border-horizon/70 bg-void/65 text-sm text-glow-muted" role="status">
              Loading NASA mission stories…
            </div>
          )}

          {error && !activeStory && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-panel border border-horizon/70 bg-void/65 px-6 text-center" role="alert">
              <p className="max-w-md text-sm leading-6 text-glow-muted">
                NASA&apos;s Image and Video Library is temporarily unavailable. The stories will return when the source can be reached.
              </p>
              <button
                type="button"
                onClick={() => { void mutate(); }}
                className="rounded-control border border-horizon px-4 py-2 text-sm font-medium text-glow transition-colors hover:border-ion/60 hover:text-ion focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ion"
              >
                Try again
              </button>
            </div>
          )}

          {activeStory && stories && (
            <article
              key={activeStory.nasaId}
              className={`${styles.slide} overflow-hidden rounded-panel border border-horizon/70 bg-void/75 shadow-panel`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${activeStoryIndex + 1} of ${stories.length}: ${activeStory.category}`}
            >
              <div className="group relative flex h-[230px] items-center justify-center overflow-hidden bg-[#03050b] sm:h-[330px] lg:h-[390px]">
                {failedImageIds.has(activeStory.nasaId) ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--limen-ion)_9%,transparent),transparent_68%)] px-6 text-center">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion/80">Photo unavailable</span>
                    <span className="text-xs text-glow-muted">The NASA story and its source details are still available below.</span>
                  </div>
                ) : (
                  <Image
                    src={activeStory.imageUrl}
                    alt={activeStory.title}
                    fill
                    sizes="(max-width: 767px) 100vw, 1180px"
                    unoptimized
                    className="object-contain transition-transform duration-500 ease-linen group-hover:scale-[1.015]"
                    onError={() => {
                      setFailedImageIds((current) => new Set(current).add(activeStory.nasaId));
                    }}
                  />
                )}
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-void/70 to-transparent" />
                <p className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-void/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-glow backdrop-blur-sm sm:bottom-5 sm:left-5">
                  {activeStory.category}
                </p>
              </div>

              <div className="grid gap-6 px-5 py-5 sm:px-7 sm:py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-8">
                <div className="min-w-0">
                  <h3 className="max-w-3xl text-lg font-semibold leading-snug tracking-tight text-glow sm:text-xl">
                    {activeStory.title}
                  </h3>
                  <p className="mt-3 line-clamp-4 max-w-3xl text-sm leading-6 text-glow-muted">
                    {activeStory.description}
                  </p>
                  <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-glow-faint">
                    <span>NASA ID · {activeStory.nasaId}</span>
                    {activeStory.dateCreated && <span>{activeStory.dateCreated.slice(0, 10)}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-horizon/60 pt-4 text-[11px] text-glow-muted lg:min-w-48 lg:flex-col lg:items-end lg:justify-end lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                  <p className="max-w-56 lg:text-right">
                    <span className="text-glow-faint">Image credit</span>
                    <span className="mt-1 block text-glow-muted">{activeStory.credit}</span>
                  </p>
                  <a
                    href={activeStory.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-ion transition-colors hover:text-ion-soft focus-visible:rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ion"
                  >
                    NASA source <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </article>
          )}

          {stories && stories.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2" aria-label="Choose a NASA story">
                {stories.map((story, index) => (
                  <button
                    key={story.nasaId}
                    type="button"
                    aria-label={`Show ${story.category}: ${story.title}`}
                    aria-pressed={index === activeStoryIndex}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full transition-[width,background-color] duration-base ease-linen focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ion ${index === activeStoryIndex ? "w-8 bg-ion" : "w-2.5 bg-horizon hover:bg-glow-faint"}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={autoplayEnabled ? "Pause automatic slide rotation" : "Resume automatic slide rotation"}
                  aria-pressed={!autoplayEnabled}
                  onClick={() => setAutoplayEnabled((enabled) => !enabled)}
                  className="mr-1 rounded-control px-2 py-2 text-xs font-medium text-glow-muted transition-colors hover:text-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion"
                >
                  {autoplayEnabled ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  aria-label="Previous NASA story"
                  onClick={() => setActiveIndex((current) => (current - 1 + stories.length) % stories.length)}
                  className="flex size-9 items-center justify-center rounded-full border border-horizon/80 text-glow transition-colors hover:border-ion/60 hover:text-ion focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion"
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  type="button"
                  aria-label="Next NASA story"
                  onClick={() => setActiveIndex((current) => (current + 1) % stories.length)}
                  className="flex size-9 items-center justify-center rounded-full border border-horizon/80 text-glow transition-colors hover:border-ion/60 hover:text-ion focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion"
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-5 text-glow-faint">
          Metadata and imagery are served by NASA&apos;s Image and Video Library. NASA does not endorse LIMEN.
        </p>
      </div>
    </section>
  );
}
