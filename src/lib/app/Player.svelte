<script lang="ts" module>
  // Soloist entity envelope: see Soloist WebSocket API docs.
  export type Entity = {
    uri: string;
    decorations?: {
      identity?: { name?: string };
      visual_identity?: { cover?: { url: string; size: string }[] };
      creators?: { entity: Entity }[];
      playback?: { duration_ms?: number };
    };
  };
  export type Position = { position_ms: number; timestamp_ms: number; speed: number };
  export type Options = { shuffle: boolean; repeat: "off" | "context" | "track" };
  export type Playback = {
    status: string;
    item?: Entity;
    position?: Position;
    volume: number;
    options?: Options;
    available_actions?: Record<string, unknown>;
  };
  /** Settings › Appearance › Player: what the now-playing text shows and the bar's size (html.player-small/large). */
  export type PlayerLook = { album: boolean; year: boolean; size: "small" | "normal" | "large" };
  export const PLAYER_LOOK: PlayerLook = { album: true, year: true, size: "normal" };
</script>

<script lang="ts">
  import { L } from "./i18n";
  import { enter, exit, glide, motion, nudge, pop } from "./motion.svelte";
  import Marquee from "./Marquee.svelte";
  import PlayIcon from "./PlayIcon.svelte";
  import SaveIcon from "./SaveIcon.svelte";
  import type { Track } from "./Playlist.svelte";
  import type { Row } from "./Library.svelte";
  let {
    note,
    playback,
    track,
    send,
    open,
    openArtist,
    look = PLAYER_LOOK,
    playing: held,
    liked,
    setLiked,
    addTo,
  }: {
    /** The demo: volume locked at 0, this said beside it. */
    note?: string;
    playback: Playback | null;
    /** Details of the playing track (explicit, version, album, year), once loaded. */
    track: Track | null;
    send: (command: string, extra?: Record<string, unknown>) => unknown;
    open: (row: Row) => void;
    openArtist: (uri: string, name: string) => void;
    look?: PlayerLook;
    /** Playing as the app holds it (through a start or skip, while Soloist reports stopped/paused for a moment). */
    playing?: boolean;
    /** The playing song is in Liked songs; undefined: unknown or not a song (the heart hides). */
    liked?: boolean;
    setLiked: (on: boolean) => void;
    /** Opens the save menu (Liked songs, playlists) at the saved button. */
    addTo?: (uri: string, at: HTMLElement) => void;
  } = $props();

  // The clock only drives the time labels (and the line under reduced motion): once a second, and only while playing.
  let now = $state(Date.now());
  $effect(() => {
    if (!playing) return;
    now = Date.now();
    const t = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(t);
  });

  // Local values while the user drags, so the thumb doesn't jump back mid-drag.
  let seeking = $state<number | null>(null);
  let volumeDrag = $state<number | null>(null);
  // After a seek the local value stays until Soloist reports the new position (or 2 s pass), so the head doesn't snap back.
  let seekDragging = false;
  let seekTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    void playback?.position;
    if (!seekDragging) seeking = null;
  });
  function seek(v: number) {
    seekDragging = false;
    seeking = Math.max(0, Math.min(duration, v));
    send("seek", { position_ms: seeking });
    clearTimeout(seekTimer);
    seekTimer = setTimeout(() => (seeking = null), 2000);
  }

  // Volume is heard while it moves: sent at most every 100 ms (the last value always goes), and the local value
  // stays 1.5 s after the last send, by when Soloist has reported it back.
  let volTimer: ReturnType<typeof setTimeout> | undefined;
  let volSent = 0;
  let unmuteTo = 50;
  function setVolume(v: number) {
    const vol = Math.round(Math.max(0, Math.min(100, v)));
    volumeDrag = vol;
    clearTimeout(volTimer);
    const go = () => {
      volSent = Date.now();
      send("set_volume", { volume: vol });
      volTimer = setTimeout(() => (volumeDrag = null), 1500);
    };
    if (Date.now() - volSent > 100) go();
    else volTimer = setTimeout(go, 100);
  }
  // Mute remembers the level, so unmuting returns to it instead of jumping to full.
  function toggleMute() {
    if (volume) unmuteTo = volume;
    setVolume(volume ? 0 : unmuteTo);
  }
  // Scrolling over the volume (wheel or two fingers, either axis) turns it.
  let wheelAcc = 0;
  function wheelVolume(e: WheelEvent) {
    if (!playback) return;
    e.preventDefault();
    wheelAcc += (e.deltaX - e.deltaY) / 4;
    const step = Math.trunc(wheelAcc);
    if (!step) return;
    wheelAcc -= step;
    setVolume(volume + step);
  }

  const item = $derived(playback?.item);
  const playing = $derived(held ?? playback?.status === "playing");
  const duration = $derived(item?.decorations?.playback?.duration_ms ?? 0);
  const position = $derived.by(() => {
    const p = playback?.position;
    if (!p) return 0;
    return Math.max(0, Math.min(duration, p.position_ms + (now - p.timestamp_ms) * p.speed));
  });
  const shownPos = $derived(seeking ?? position);
  // The progress line runs on its own: from where Soloist last reported, a linear CSS animation to the end in the time
  // left. Each report (seek, pause, next track) restarts it; a drag or a pause stops it.
  const runFrom = $derived.by(() => {
    const p = playback?.position;
    return p ? Math.max(0, Math.min(duration, p.position_ms + (Date.now() - p.timestamp_ms) * p.speed)) : 0;
  });
  // Reduced motion: no run, the line steps with the clock.
  const runFor = $derived(
    !motion.reduce && playing && seeking === null && duration && playback?.position?.speed ? (duration - runFrom) / playback.position.speed : 0,
  );
  const volume = $derived(volumeDrag ?? playback?.volume ?? 0);
  const shuffle = $derived(playback?.options?.shuffle ?? false);
  const repeat = $derived(playback?.options?.repeat ?? "off");

  const title = $derived(item?.decorations?.identity?.name ?? "");
  const creators = $derived(
    (item?.decorations?.creators ?? []).map((c) => ({ uri: c.entity?.uri, name: c.entity?.decorations?.identity?.name ?? "" })).filter((c) => c.name),
  );
  const artists = $derived(creators.map((c) => c.name).join(", "));
  // Only details that belong to this track (they load a moment after it starts).
  const details = $derived(track && item && (track.uri === item.uri || track.name === title) ? track : null);
  const cover = $derived.by(() => {
    const covers = item?.decorations?.visual_identity?.cover ?? [];
    return (covers.find((c) => c.size === "default") ?? covers[0])?.url;
  });

  // Without available_actions (older snapshot) assume everything is allowed. Not used for
  // play/pause: Soloist omits "play" from the list even while paused.
  const can = (a: string) => !!item && (!playback?.available_actions || a in playback.available_actions);

  const mmss = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  // Soloist sets repeat in two steps, order matters (see WebSocket API docs).
  function cycleRepeat() {
    if (repeat === "off") {
      send("set_repeat_track", { enabled: false });
      send("set_repeat_context", { enabled: true });
    } else if (repeat === "context") {
      send("set_repeat_context", { enabled: false });
      send("set_repeat_track", { enabled: true });
    } else {
      send("set_repeat_track", { enabled: false });
      send("set_repeat_context", { enabled: false });
    }
  }


  const repeatLabel = $derived(
    repeat === "off" ? L.player.repeat : repeat === "context" ? L.player.repeatTrack : L.player.repeatOff,
  );
</script>

{#snippet slider(label: string, max: number, value: number, disabled: boolean, text: string, jump: number, tip: (v: number) => string, input: (v: number) => void, commit: (v: number) => void, run = 0, from = 0)}
  <!-- The original slider's input, untouched: the native range on top, invisible, takes the pointer, keys and screen
       readers; its value is the live one. Only the look is drawn: line, fill and ring knob, moved by transform (--f).
       Hover previews the target: a ghost fill to the pointer and its value. While playing, `glide` runs the fill and knob
       to the end on the compositor (fake smooth, no ticks); the drawn parts are never re-created. -->
  <div class="slider" class:off={disabled} style:--f={max ? Math.min(1, value / max) : 0} use:glide={{ from, ms: run }}>
    <div class="track"><div class="ghost"></div><div class="fill"></div></div>
    <div class="rail" aria-hidden="true"><div class="knob"></div></div>
    <div class="tip" aria-hidden="true"></div>
    <input
      type="range" min="0" {max} step={max > 100 ? 1000 : 1} aria-label={label} aria-valuetext={text}
      {value} {disabled}
      onpointermove={(e) => {
        const el = e.currentTarget.parentElement!;
        const r = el.getBoundingClientRect();
        const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        el.style.setProperty("--hov", String(f));
        el.querySelector(".tip")!.textContent = tip(f * max);
      }}
      onkeydown={(e) => {
        // Arrows move in useful steps (5 s, 5 %) instead of the range's 1 s / 1 %.
        const d = ({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 } as Record<string, number>)[e.key];
        if (!d) return;
        e.preventDefault();
        commit(Math.max(0, Math.min(max, value + d * jump)));
      }}
      oninput={(e) => input(+e.currentTarget.value)}
      onchange={(e) => commit(+e.currentTarget.value)}
    />
  </div>
{/snippet}

<footer class="bar {look.size}" aria-label={L.player.label}>
  <div class="now">
    {#key item?.uri}
      <!-- One authored moment: the cover and names crossfade when the track changes (the old one pinned in place). -->
      <div class="now-in" in:enter={{ y: 4 }} out:exit={{ y: -4 }}>
        <div class="art">
          {#if item && cover && details?.album_uri}
            <button class="cover-open" aria-label={L.player.openAlbum(details.album)} data-open={details.album_uri} onclick={() => open({ uri: details.album_uri!, name: details.album, image: details.image, kind: "albums", line: L.kind.album })}>
              <img class="cover" src={cover} alt="" />
            </button>
          {:else if item && cover}
            <img class="cover" src={cover} alt="" />
          {:else}
            <div class="cover cover-empty" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            </div>
          {/if}
        </div>
        <div class="meta">
          {#if item}
            <div class="title-row">
              <span class="title"><Marquee on={playing} title={details?.version ? `${title} · ${details.version}` : title}>{title}{#if details?.version}<span class="ver">{" · "}{details.version}</span>{/if}</Marquee></span>
              {#if details?.explicit}<span class="explicit" title={L.common.explicit} aria-label={L.common.explicit}>E</span>{/if}
              <!-- Save, right after the title as in the track lists: saves to Liked songs, saved opens where it's saved. -->
              {#if liked !== undefined && item.uri}
                <button class="like" class:on={liked} use:pop aria-haspopup={liked ? "menu" : undefined} aria-label={liked ? L.common.saved : L.common.like} title={liked ? L.common.saved : L.common.like} onclick={(e) => (liked ? (addTo ? addTo(item.uri!, e.currentTarget) : setLiked(false)) : setLiked(true))}>
                  <SaveIcon on={liked} />
                </button>
              {/if}
            </div>
            <div class="artist"><Marquee on={playing} title={artists} inner="links">{#each creators as c, i}{#if i}<span class="sep">{", "}</span>{/if}{#if c.uri?.startsWith("spotify:artist:")}<button class="link" onclick={() => openArtist(c.uri!, c.name)} data-open={c.uri}>{c.name}</button>{:else}<span>{c.name}</span>{/if}{/each}</Marquee></div>
            {#if look.album && details?.album}
              <div class="album" in:enter={{ y: 0 }} out:exit={{ y: 0, collapse: true }}><svg class="disc" viewBox="0 0 24 24" role="img" aria-label={L.player.album}><circle cx="12" cy="12" r="9" /><circle class="fill" cx="12" cy="12" r="2" /></svg><Marquee on={playing}>
                {#if details.album_uri}<button class="link" title={details.album} data-open={details.album_uri} onclick={() => open({ uri: details.album_uri!, name: details.album, image: details.image, kind: "albums", line: L.kind.album })}>{details.album}</button>{:else}<span>{details.album}</span>{/if}{#if look.year && details.year}<span class="year">{" · "}{details.year}</span>{/if}
              </Marquee></div>
            {/if}
          {:else}
            <div class="title idle">{L.player.idle}</div>
            <div class="artist">{L.player.idleHint}</div>
          {/if}
        </div>
      </div>
    {/key}
  </div>

  <div class="center">
    <div class="transport">
      <button
        class="icon toggle" use:pop class:on={shuffle} aria-pressed={shuffle} aria-label={L.player.shuffle}
        disabled={!can("shuffle")} onclick={() => send("set_shuffle", { enabled: !shuffle })}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
      </button>
      <button class="icon skip" use:nudge={-4} aria-label={L.player.previous} disabled={!can("skip_prev")} onclick={() => send("skip_prev")}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M19 19 9 12l10-7z" /><path d="M5.5 18.5v-13" /></svg>
      </button>
      <button
        class="play" aria-label={playing ? L.common.pause : L.common.play}
        disabled={!item}
        onclick={() => send(playing ? "pause" : "play")}
      >
        <PlayIcon {playing} />
      </button>
      <button class="icon skip" use:nudge={4} aria-label={L.player.next} disabled={!can("skip_next")} onclick={() => send("skip_next")}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="m5 5 10 7-10 7z" /><path d="M18.5 5.5v13" /></svg>
      </button>
      <button
        class="icon toggle" use:pop={180} class:on={repeat !== "off"} aria-label={repeatLabel}
        disabled={!can("set_repeat")} onclick={cycleRepeat}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" />
        </svg>
        {#if repeat === "track"}<span class="badge" aria-hidden="true">1</span>{/if}
      </button>
    </div>
    <!-- Progress under the transport, times at its ends. -->
    <div class="progress">
      <span class="time pos">{item ? mmss(shownPos) : "–:––"}</span>
      {@render slider(
        L.player.position, duration || 1, shownPos, !can("seek") || !duration,
        L.player.of(mmss(shownPos), mmss(duration)), 5000,
        mmss,
        (v) => { seekDragging = true; seeking = v; },
        seek,
        runFor,
        duration ? runFrom / duration : 0,
      )}
      <span class="time">{item ? mmss(duration) : "–:––"}</span>
    </div>
  </div>

  <div class="volume" onwheel={(e) => !note && wheelVolume(e)}>
    {#if note}<span class="note">{note}</span>{/if}
    <button
      class="icon" use:pop aria-label={volume ? L.player.mute : L.player.unmute} title={note} disabled={!playback || !!note}
      onclick={toggleMute}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path class="fill" d="M11 5 6 9H3v6h3l5 4z" />
        {#if volume === 0}
          <path d="m16 9 5 6M21 9l-5 6" />
        {:else}
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          {#if volume > 50}<path d="M18.5 5.5a9 9 0 0 1 0 13" />{/if}
        {/if}
      </svg>
    </button>
    {@render slider(
      L.player.volume, 100, volume, !playback || !!note, `${volume} %`, 5,
      (v) => `${Math.round(v)} %`,
      setVolume,
      setVolume,
    )}
  </div>
</footer>

<style>
  /* No fill of its own: the row's glass is .dock in +page.svelte. Three columns like the toolbar above it: what plays
     close to the sidebar, the transport centred on the body, the volume on the right edge. */
  /* Size (Settings › Player): every part scales together by --player-k (0.8 / 1 / 1.25, +page.svelte): cover,
     controls, glyphs, the slider's line, knob and width; text steps one type size. --k scales a px size here. */
  .bar {
    --k: var(--player-k, 1);
    height: 100%;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 520px) minmax(0, 1fr);
    align-items: center;
    gap: var(--sp-5);
    padding: 0 var(--gutter) 0 var(--sp-3);
    position: relative;
  }

  /* What plays: the cover, then one text stack in three clear steps, each a size and a colour down:
     title (--name-fs 600 --fg, the version a --fg-3 suffix) › artists (--sub-fs --fg-2) › album · year (--small-fs --fg-3). */
  .now { position: relative; min-width: 0; }
  .now-in { display: flex; align-items: center; gap: var(--sp-3); min-width: 0; }
  .art { position: relative; flex: none; width: var(--player-cover); height: var(--player-cover); }
  .cover {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: var(--r-2);
    object-fit: cover;
    outline: 0.5px solid color-mix(in srgb, var(--fg) 10%, transparent);
    outline-offset: -0.5px;
  }
  /* The cover opens its album: pressed it dips, focused it takes the accent ring. */
  .cover-open { width: 100%; height: 100%; border-radius: var(--r-2); transition: transform var(--m-3) var(--ease); }
  .cover-open:active { transform: scale(0.96); transition-duration: var(--m-1); }
  .cover-open:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 2px; }
  .cover-empty { display: grid; place-items: center; background: color-mix(in srgb, var(--fg) 5%, transparent); color: var(--fg-3); }
  .cover-empty svg { width: 40%; height: 40%; }
  .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .title-row { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; }
  .title-row .title { flex: 0 1 auto; min-width: 0; }
  .title, .artist, .album { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; line-height: 1.3; }
  .title { font-size: var(--name-fs); font-weight: 600; color: var(--fg); }
  .ver { font-weight: 400; color: var(--fg-3); }
  .title.idle { color: var(--fg-2); font-weight: 500; }
  .artist { font-size: var(--sub-fs); color: var(--fg-2); }
  /* The artists inside a moving line: a plain row, no scroll or fade of their own. */
  .artist :global(.links) { overflow: visible; mask-image: none; }
  /* The album line opens with a small disc, so it reads as the album at a glance. */
  .album { display: flex; align-items: center; gap: var(--sp-1); font-size: var(--small-fs); color: var(--fg-3); }
  .album .disc { flex: none; width: 1.1em; height: 1.1em; stroke-width: 2; }
  .album .link { color: inherit; }
  .year { font-variant-numeric: tabular-nums; }
  /* Size (Settings): the bar, cover and play scale with --player-k (+page.svelte); the text steps a type size. */
  .small .title { font-size: var(--fs); }
  .small .artist { font-size: var(--meta-fs); }
  .large .title { font-size: var(--t-section); }
  .large .artist { font-size: var(--name-fs); }
  .large :is(.album, .time) { font-size: var(--sub-fs); }

  /* Centre: the transport over the progress, one instrument. */
  .center { display: flex; flex-direction: column; align-items: stretch; gap: 2px; min-width: 0; }
  .transport { display: flex; align-items: center; justify-content: center; gap: var(--sp-2); }
  .progress { display: flex; align-items: center; gap: var(--sp-2); }
  /* Elapsed is the live number (--fg-2), the length its quiet reference (--fg-3). */
  .time { flex: none; min-width: 4.5ch; font-size: var(--small-fs); color: var(--fg-3); font-variant-numeric: tabular-nums; }
  .time.pos { text-align: right; color: var(--fg-2); }

  button:where(:not(.link)) {
    display: grid;
    place-items: center;
    border: none;
    background: none;
    color: var(--fg-2);
    cursor: default;
    padding: 0;
    position: relative;
    border-radius: var(--r-2);
  }
  button:disabled { opacity: 0.35; }

  svg { width: calc(18px * var(--k)); height: calc(18px * var(--k)); fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  svg .fill { fill: currentColor; }
  /* Icon buttons ride the control height, so density reaches them. Rank: play › skips (--fg) › toggles (--fg-2). */
  .icon { width: calc((var(--ctl-h) + var(--sp-1)) * var(--k)); height: calc(var(--ctl-h) * var(--k)); }
  .skip { color: var(--fg); }
  /* The arrow darts the way it skips on a click (motion `nudge`); pressed, the whole glyph dips. */
  .skip svg { width: calc(17px * var(--k)); height: calc(17px * var(--k)); }
  .toggle svg { width: calc(15px * var(--k)); height: calc(15px * var(--k)); }
  .toggle.on, .toggle.on:hover:not(:disabled) { color: var(--accent); }
  .badge { position: absolute; top: 2px; right: 3px; font-size: var(--micro-fs); font-weight: 700; line-height: 1; transform: scale(0.75); }

  /* Play/pause: no disc, a bare --fg glyph, the largest in the row, so it leads by size alone. Its box is the play
     size (--ctl-h + --sp-1, times the player's size); pointed at it swells a little, pressed it dips. Flat: no shadow.
     Glyphs: a soft-cornered triangle and two rounded bars; the swap turns a quarter and scales through the centre. */
  .play { width: calc((var(--ctl-h) + var(--sp-1)) * var(--k)); height: calc((var(--ctl-h) + var(--sp-1)) * var(--k)); color: var(--fg); }
  /* Every player button answers alike, with no fill: pointed at it swells and its glyph turns --fg, pressed it dips;
     keyboard focus is an accent ring. A click adds its own move: play/pause swaps, skips dart (nudge), toggles pop. */
  .play, .icon { transition: transform var(--m-3) var(--ease), color var(--m-2) var(--ease); }
  :is(.play, .icon):hover:not(:disabled) { transform: scale(1.1); color: var(--fg); transition-duration: var(--m-1); }
  :is(.play, .icon):active:not(:disabled) { transform: scale(0.9); transition-duration: var(--m-1); }
  :is(.play, .icon):focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 0; }
  .play :global(svg) { width: 80%; height: 80%; }

  .volume { display: flex; align-items: center; justify-content: flex-end; gap: var(--sp-1); }
  .note { margin-right: var(--sp-2); padding: 3px 8px; border-radius: var(--r-1); background: var(--hover); color: var(--fg-3); font-size: var(--small-fs); font-weight: 500; white-space: nowrap; }
  .volume .slider { flex: none; width: calc(112px * var(--k)); }

  /* Slider: a 3px line in a 20px row (the invisible range reaches 6px further up and down, so it's easy to hit).
     Touched, the line thickens to 5px, a solid knob sits on the fill's head, a ghost fill runs to the pointer and the
     target's value floats just above the pointer. Fill, ghost, knob and line move by transform only: a new value glides
     in --m-3 (the playing position between its ticks too), a drag follows the pointer with no transition. The fill's
     colour is --c. */
  .slider {
    --c: var(--fg-2);
    --kn: calc(11px * var(--k));
    position: relative;
    flex: 1;
    min-width: 0;
    height: calc(20px * var(--k));
    display: grid;
    align-items: center;
  }
  /* What plays is lit in the cover's colour. */
  .progress .slider { --c: var(--now); }
  .volume .slider:not(.off):is(:hover, :active, :has(input:focus-visible)) { --c: var(--fg); }
  .track {
    position: relative; height: calc(5px * var(--k)); border-radius: calc(2.5px * var(--k)); background: var(--border-strong); overflow: hidden;
    transform: scaleY(0.6); transition: transform var(--m-5) var(--ease);
  }
  .ghost, .fill { position: absolute; inset: 0; transform-origin: left; will-change: transform; }
  .ghost { background: color-mix(in srgb, var(--fg) 14%, transparent); transform: scaleX(var(--hov, 0)); opacity: 0; transition: opacity var(--m-2) var(--ease); }
  .fill { background: var(--c); transform: scaleX(var(--f)); transition: transform var(--m-3) var(--ease), background var(--m-2) var(--ease); }
  /* The rail sits one width to the left with the knob at its right end, so moving it never reaches past the right edge
     (overflow there scrolled the window sideways); overflow to the left does not scroll. */
  .rail { position: absolute; inset: 0 100% 0 -100%; pointer-events: none; transform: translateX(calc(var(--f) * 100%)); transition: transform var(--m-3) var(--ease); will-change: transform; }
  .slider:active .fill, .slider:active .rail { transition: none; }

  .knob {
    position: absolute;
    top: 50%;
    left: 100%;
    width: var(--kn);
    height: var(--kn);
    margin: calc(var(--kn) / -2) 0 0 calc(var(--kn) / -2);
    border-radius: 50%;
    background: var(--c);
    opacity: 0;
    transform: scale(0.4);
    transition: opacity var(--m-5) var(--ease), transform var(--m-5) var(--ease);
  }
  /* The value under the pointer: a small floating label (--panel, hairline, --shadow) pinned just above the pointer,
     on the line, so the eye doesn't leave the pointer to read it. */
  .tip {
    position: absolute;
    bottom: calc(50% + var(--sp-2));
    left: clamp(14px, calc(var(--hov, 0) * 100%), calc(100% - 14px));
    transform: translate(-50%, 2px) scale(0.96);
    transform-origin: 50% 100%;
    padding: 2px var(--sp-1);
    border-radius: var(--r-1);
    background: var(--panel);
    box-shadow: 0 0 0 0.5px var(--border-strong), var(--shadow);
    color: var(--fg);
    font-size: var(--micro-fs);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.3;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--m-3) var(--ease), transform var(--m-3) var(--ease);
    z-index: 2;
  }
  .tip:empty { display: none; }
  .slider input { position: absolute; inset: -6px 0; width: 100%; height: calc(100% + 12px); margin: 0; opacity: 0; appearance: none; background: none; z-index: 1; }
  /* A 1px native thumb, so the range maps the pointer over its full width, the same as the drawn fill. */
  .slider input::-webkit-slider-runnable-track { height: 100%; background: none; border: none; }
  .slider input::-webkit-slider-thumb { appearance: none; width: 1px; height: 100%; border: none; }

  .slider:not(.off):is(:hover, :active) .track, .slider:has(input:focus-visible) .track { transform: none; transition-duration: var(--m-2); }
  .slider:not(.off):is(:hover, :active) .knob, .slider:has(input:focus-visible) .knob { opacity: 1; transform: none; transition-duration: var(--m-1), var(--m-3); }
  .slider:not(.off):active .knob { transform: scale(1.2); }
  .slider:not(.off):hover .ghost { opacity: 1; }
  .slider:not(.off):is(:hover, :active) .tip { opacity: 1; transform: translate(-50%, 0); transition-duration: var(--m-1); }
  .slider:has(input:focus-visible) .knob { box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent); }
  .slider.off { opacity: 0.45; }


  @media (prefers-reduced-motion: reduce) {
    button, .track, .tip, .ghost, .knob, .cover-open { transition: none; }
    :is(.play, .icon):is(:hover, :active), .cover-open:active { transform: none !important; }
  }

  /* Container is .dock (the body's width). */
  @container (max-width: 760px) {
    .bar { gap: var(--sp-4); }
  }
  @container (max-width: 660px) {
    .bar { grid-template-columns: minmax(0, 1fr) minmax(220px, 1.4fr); }
    .volume { display: none; }
  }
  @container (max-width: 520px) {
    .bar { grid-template-columns: minmax(0, 1fr) auto; }
    .toggle { display: none; }
  }
</style>
