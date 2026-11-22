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
  export type PlayerLook = { album: boolean; year: boolean; size: "small" | "normal" | "large"; float: boolean };
  export const PLAYER_LOOK: PlayerLook = { album: true, year: true, size: "normal", float: false };
</script>

<script lang="ts">
  import { tick, untrack } from "svelte";
  import { L } from "./i18n";
  import { enter, exit, glide, motion, nudge, pop, press as pressEl } from "./motion.svelte";
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
    fit,
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
    /** A song is in Liked songs; undefined: unknown or not a song (the heart hides). Asked for the song shown. */
    liked?: (uri: string) => boolean | undefined;
    setLiked: (uri: string, on: boolean) => void;
    /** Opens the save menu (Liked songs, playlists) at the saved button. */
    addTo?: (uri: string, at: HTMLElement) => void;
    /** Fits the floating player's width to what it now shows. */
    fit?: () => void;
  } = $props();

  let playBtn = $state<HTMLButtonElement>();
  let prevBtn = $state<HTMLButtonElement>();
  let nextBtn = $state<HTMLButtonElement>();
  /** A key pressed the transport (media keys, Space): its button answers as if clicked. */
  export function press(key: "play" | "next" | "prev") {
    if (key !== "play") skip(key === "next" ? 1 : -1);
    pressEl(key === "play" ? playBtn : key === "next" ? nextBtn : prevBtn);
  }
  /** Which way a song change moves: back after a press of previous (if the change follows within a few seconds), else
   *  on (next, a song ending, a song picked). Read by the change's transitions as they start. */
  let dir = 1;
  let skippedAt = 0;
  const skip = (d: 1 | -1) => ((dir = d), (skippedAt = Date.now()));
  const way = () => (Date.now() - skippedAt < 3000 ? dir : 1);

  // The clock only drives the time labels (and the line under reduced motion): once a second, only while playing and seen.
  let now = $state(Date.now());
  let seen = $state(!document.hidden);
  $effect(() => {
    const on = () => (seen = !document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  });
  $effect(() => {
    if (!playing || !seen) return;
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
  // The pointer drives the volume itself (the range and the speaker only take keys and screen readers), so a drag works
  // over its whole width, the speaker's end included: a press there that doesn't move mutes.
  let volDown: { x: number; speaker: boolean; moved: boolean } | null = null;
  function volPointer(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const at = () => Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100;
    if (e.type === "pointerdown") {
      if (!playback || note || e.button) return;
      el.setPointerCapture(e.pointerId);
      const speaker = e.clientX >= el.querySelector(".mute")!.getBoundingClientRect().left;
      volDown = { x: e.clientX, speaker, moved: false };
      if (!speaker) setVolume(at());
      return;
    }
    if (!volDown) return;
    if (e.type === "pointermove") {
      if (Math.abs(e.clientX - volDown.x) > 3) volDown.moved = true;
      if (volDown.moved || !volDown.speaker) setVolume(at());
      return;
    }
    if (e.type === "pointerup" && volDown.speaker && !volDown.moved) toggleMute();
    volDown = null;
  }
  // A slider swells (.held stands in for :hover) a moment after the pointer arrives (--m-1), so a pass over it doesn't,
  // and stays 120 ms after it leaves, so a slip off doesn't collapse it under the pointer coming back. Neither swap
  // starts while the last swell or shrink (--m-3) still runs, so darting in and out never makes it jump back and forth.
  function linger(node: HTMLElement) {
    let t: ReturnType<typeof setTimeout> | undefined;
    let busyTill = 0;
    const to = (held: boolean, ms: number) =>
      (t = setTimeout(() => (node.classList.toggle("held", held), (busyTill = performance.now() + (motion.ms * 2) / 3)), Math.max(ms, busyTill - performance.now())));
    const on = () => (clearTimeout(t), node.classList.contains("held") || to(true, motion.ms / 3));
    const off = () => (clearTimeout(t), node.classList.contains("held") && to(false, 120));
    node.addEventListener("pointerenter", on);
    node.addEventListener("pointerleave", off);
    return {
      destroy() {
        clearTimeout(t);
        node.removeEventListener("pointerenter", on);
        node.removeEventListener("pointerleave", off);
      },
    };
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

  // The now part changes once per song: the old one stays until the new one's details (version, explicit, album) are
  // in, at most 400 ms, so its text and the floating player's width change in one step, not two or three.
  const ready = $derived(track && item && (track.uri === item.uri || track.name === item.decorations?.identity?.name) ? track : null);
  let shown = $state<{ item: typeof item; track: Track | null }>({ item: untrack(() => playback?.item), track: null });
  $effect(() => {
    const it = item, tr = ready;
    const same = it?.uri === untrack(() => shown.item?.uri);
    if (same || tr || !it) return void (shown = { item: it, track: tr ?? (same ? untrack(() => shown.track) : null) });
    const t = setTimeout(() => (shown = { item: it, track: null }), 400);
    return () => clearTimeout(t);
  });
  // Once the swap is drawn, the floating player takes its new width.
  $effect(() => {
    void shown;
    tick().then(() => fit?.());
  });
  const song = $derived(shown.item);
  const saved = $derived(song?.uri ? liked?.(song.uri) : undefined);
  const title = $derived(song?.decorations?.identity?.name ?? "");
  const creators = $derived(
    (song?.decorations?.creators ?? []).map((c) => ({ uri: c.entity?.uri, name: c.entity?.decorations?.identity?.name ?? "" })).filter((c) => c.name),
  );
  const artists = $derived(creators.map((c) => c.name).join(", "));
  // Only details that belong to this track (they load a moment after it starts).
  const details = $derived(shown.track);
  const cover = $derived.by(() => {
    const covers = song?.decorations?.visual_identity?.cover ?? [];
    return (covers.find((c) => c.size === "default") ?? covers[0])?.url;
  });

  // Without available_actions (older snapshot) assume everything is allowed. Not used for
  // play/pause: Soloist omits "play" from the list even while paused.
  const can = (a: string) => !!item && (!playback?.available_actions || a in playback.available_actions);
  // At rest the progress line stops short of each end by the room the volume's line leaves before its speaker
  // (132px × (1 − 0.74), times the player's size), so the two lines read alike.
  const VOL_GAP = 132 * (1 - 0.74);
  const PLAYER_K = { small: 0.8, normal: 1, large: 1.25 };
  let seekW = $state(0);
  const seekOff = $derived(!can("seek") || !duration);

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

{#snippet level()}
  <div class="vol-row" aria-hidden="true">
    <svg viewBox="0 0 24 24">
      <path class="fill" d="M11 5 6 9H3v6h3l5 4z" />
      {#if volume === 0}
        <path d="m16 9 5 6M21 9l-5 6" />
      {:else}
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        {#if volume > 50}<path d="M18.5 5.5a9 9 0 0 1 0 13" />{/if}
      {/if}
    </svg>
    <span class="pct">{volume}</span>
  </div>
{/snippet}

<!-- The player shows no tooltips (`data-no-tip`, AGENTS.md › Tooltip), but for shuffle and repeat (`data-tips`), whose
     tips name their state; and its sliders' value label. -->
<footer class="bar {look.size}" aria-label={L.player.label} data-no-tip>
  <div class="now">
    {#key song?.uri}
      <!-- One authored moment: the song changes like a page turning the way it went: the old one (pinned in place) slips
           out to one side as the new one slides in from the other, a touch longer, crossfading. -->
      <div class="now-in" in:enter={{ y: 0, x: 14 * way(), scale: 0.98, f: 1.5 }} out:exit={{ y: 0, x: -10 * way(), scale: 0.98 }}>
        <div class="art">
          {#if song && cover && details?.album_uri}
            <button class="cover-open" aria-label={L.player.openAlbum(details.album)} data-open={details.album_uri} onclick={() => open({ uri: details.album_uri!, name: details.album, image: details.image, kind: "albums", line: L.kind.album })}>
              <img class="cover" src={cover} alt="" />
            </button>
          {:else if song && cover}
            <img class="cover" src={cover} alt="" />
          {:else}
            <div class="cover cover-empty" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            </div>
          {/if}
        </div>
        <div class="meta">
          {#if song}
            <div class="title-row">
              <span class="title"><Marquee on={playing} title={details?.version ? `${title} · ${details.version}` : title}>{title}{#if details?.version}<span class="ver">{" · "}{details.version}</span>{/if}</Marquee></span>
              {#if details?.explicit}<span class="explicit" title={L.common.explicit} aria-label={L.common.explicit}>E</span>{/if}
              <!-- Save, right after the title as in the track lists: saves to Liked songs, saved opens where it's saved. -->
              {#if saved !== undefined && song.uri}
                <button class="like" class:on={saved} use:pop aria-haspopup={saved ? "menu" : undefined} aria-label={saved ? L.common.saved : L.common.like} title={saved ? L.common.saved : L.common.like} onclick={(e) => (saved ? (addTo ? addTo(song.uri!, e.currentTarget) : setLiked(song.uri!, false)) : setLiked(song.uri!, true))}>
                  <SaveIcon on={saved} />
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
      <button class="icon skip" bind:this={prevBtn} use:nudge={-1.5} aria-label={L.player.previous} disabled={!can("skip_prev")} onclick={() => (skip(-1), send("skip_prev"))}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M19 19 9 12l10-7z" /><path d="M5.5 18.5v-13" /></svg>
      </button>
      <button
        class="play" aria-label={playing ? L.common.pause : L.common.play}
        disabled={!item}
        onclick={() => send(playing ? "pause" : "play")}
      >
        <PlayIcon {playing} />
      </button>
      <button class="icon skip" bind:this={nextBtn} use:nudge={1.5} aria-label={L.player.next} disabled={!can("skip_next")} onclick={() => (skip(1), send("skip_next"))}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="m5 5 10 7-10 7z" /><path d="M18.5 5.5v13" /></svg>
      </button>
    </div>
    <!-- Progress: the volume's build across the centre (a line in --now that swells into a capsule, the
         times inside it). The native range on top takes the pointer, keys and screen readers. While
         playing, `glide` runs the fill to the end on the compositor. -->
    <div class="seek" use:linger class:off={seekOff} bind:clientWidth={seekW} style:--rest={seekW ? 1 - (2 * VOL_GAP * PLAYER_K[look.size]) / seekW : 1} style:--f={duration ? Math.min(1, shownPos / duration) : 0} use:glide={{ from: duration ? runFrom / duration : 0, ms: runFor }}>
      <div class="bed well" aria-hidden="true"></div>
      <div class="bed" aria-hidden="true"><div class="lit"></div></div>
      <div class="times" aria-hidden="true"><span>{item ? mmss(shownPos) : "–:––"}</span><span>{item ? mmss(duration) : "–:––"}</span></div>
      <input
        type="range" min="0" max={duration || 1} step="1000" aria-label={L.player.position} aria-valuetext={L.player.of(mmss(shownPos), mmss(duration))}
        value={shownPos} disabled={seekOff}
        onkeydown={(e) => {
          // Arrows move 5 s instead of the range's 1 s.
          const d = ({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 } as Record<string, number>)[e.key];
          if (!d) return;
          e.preventDefault();
          seek(shownPos + d * 5000);
        }}
        oninput={(e) => { seekDragging = true; seeking = +e.currentTarget.value; }}
        onchange={(e) => seek(+e.currentTarget.value)}
      />
    </div>
  </div>

  <!-- The right: the play order's toggles, then the volume. -->
  <div class="side" data-tips>
    <button
      class="icon toggle" use:pop class:on={shuffle} aria-pressed={shuffle} aria-label={L.player.shuffle}
      data-tip={shuffle ? L.item.shuffleOnTip : L.item.shuffleOffTip}
      disabled={!can("shuffle")} onclick={() => send("set_shuffle", { enabled: !shuffle })}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
      </svg>
    </button>
    <button
      class="icon toggle" use:pop={180} class:on={repeat !== "off"} aria-label={repeatLabel}
      data-tip={repeat === "off" ? L.player.repeatOffTip : repeat === "context" ? L.player.repeatAllTip : L.player.repeatTrackTip}
      disabled={!can("set_repeat")} onclick={cycleRepeat}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
      {#if repeat === "track"}<span class="badge" aria-hidden="true">1</span>{/if}
    </button>

  <!-- Volume: a thin line that swells into a thick capsule on hover (as Control Center's), filled from the left in --fg; the speaker (right)
       and the level (left) sit inside it, drawn twice: quiet on the well, in --bg on the fill (a copy the fill's clip reveals). The native range
       over it takes the pointer, keys and screen readers; the speaker on top mutes. -->
    {#if note}<span class="note">{note}</span>{/if}
    <div class="vol" role="presentation" use:linger class:off={!playback || !!note} style:--f={volume / 100} onwheel={(e) => !note && wheelVolume(e)}
      onpointerdown={volPointer} onpointermove={volPointer} onpointerup={volPointer} onpointercancel={volPointer}>
      <div class="bed well" aria-hidden="true"></div>
      {@render level()}
      <div class="bed" aria-hidden="true"><div class="lit"><div class="lit-in">{@render level()}</div></div></div>
      <input
        type="range" min="0" max="100" step="1" aria-label={L.player.volume} aria-valuetext={`${volume} %`}
        value={volume} disabled={!playback || !!note}
        onkeydown={(e) => {
          const d = ({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 } as Record<string, number>)[e.key];
          if (!d) return;
          e.preventDefault();
          setVolume(volume + d * 5);
        }}
        oninput={(e) => setVolume(+e.currentTarget.value)}
      />
      <button class="mute" aria-label={volume ? L.player.mute : L.player.unmute} title={note} disabled={!playback || !!note} onclick={toggleMute}></button>
    </div>
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
  :global(html.player-float) .now { max-width: var(--float-now); }
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
  .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--sp-0); }
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
  .large :is(.album, .times) { font-size: var(--sub-fs); }

  /* Centre: the transport over the progress, one instrument. The toggles sit on the right with the volume. */
  .center { display: flex; flex-direction: column; align-items: stretch; gap: var(--sp-0); min-width: 0; }
  .transport { display: flex; align-items: center; justify-content: center; gap: var(--sp-2); }
  .side { display: flex; align-items: center; justify-content: flex-end; gap: var(--sp-0); min-width: 0; }
  .side .vol { margin-left: var(--sp-2); }

  button:where(:not(.link, .like)) {
    display: grid;
    place-items: center;
    border: none;
    background: none;
    color: var(--fg-2);
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
  /* Every player button answers alike, with no fill: pointed at its glyph turns --fg (no swell: AGENTS.md › Motion), pressed it dips;
     keyboard focus is an accent ring. A click adds its own move: play/pause swaps, skips dart (nudge), toggles pop. */
  .play, .icon { transition: transform var(--m-3) var(--ease), color var(--m-2) var(--ease); }
  :is(.play, .icon):hover:not(:disabled) { color: var(--fg); transition-duration: var(--m-1); }
  :is(.play, .icon):active:not(:disabled) { transform: scale(0.9); transition-duration: var(--m-1); }
  :is(.play, .icon):focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 0; }
  .play :global(svg) { width: 80%; height: 80%; }

  /* Volume: at rest a thin line (as the progress) with the speaker after it (--fg-2, the player's other glyphs); touched,
     the line swells into a thick capsule (as Control Center's) under the speaker, filled in --fg, the level in it.
     The swell is a scale of the well and the fill (.bed, from the left: --vol-rest across, --vol-line high); the glyphs
     never scale. The fill is a full-width layer slid left by (1 - f) and its content slid back the same, so the glyphs
     on it stay put; a drag follows at once. */
  .vol {
    --rest: 0.74; --line: 0.16;
    position: relative; flex: none; width: calc(132px * var(--k)); height: calc(var(--ctl-h) * var(--k));
    color: var(--fg-2); transition: color var(--m-2) var(--ease);
  }
  .bed {
    position: absolute; inset: 0; border-radius: var(--r-2); overflow: hidden; transform-origin: left center;
    transform: scale(var(--rest), var(--line)); transition: transform var(--m-3) var(--ease);
  }
  .well { background: var(--border-strong); transition-property: transform, background; }
  .vol-row { position: absolute; inset: 0; display: flex; flex-direction: row-reverse; align-items: center; justify-content: space-between; padding: 0 var(--sp-2); }
  .vol svg { width: calc(15px * var(--k)); height: calc(15px * var(--k)); }
  .pct { font-size: var(--micro-fs); font-weight: 500; font-variant-numeric: tabular-nums; opacity: 0; transition: opacity var(--m-2) var(--ease); }
  .lit, .lit-in { position: absolute; inset: 0; transition: transform var(--m-3) var(--ease); will-change: transform; }
  .lit { overflow: hidden; border-radius: var(--r-2); background: var(--fg-2); color: var(--bg); transform: translateX(calc((var(--f) - 1) * 100%)); transition-property: transform, background; }
  .lit-in { transform: translateX(calc((1 - var(--f)) * 100%)); }
  .lit-in .vol-row { opacity: 0; transition: opacity var(--m-2) var(--ease); }
  :is(.vol, .seek):active :is(.lit, .lit-in) { transition-duration: 0s, var(--m-2); }
  :is(.vol, .seek):not(.off):is(.held, :active, :has(:focus-visible)) { color: var(--fg); }
  :is(.vol, .seek):not(.off):is(.held, :active, :has(:focus-visible)) .bed { transform: none; }
  :is(.vol, .seek):not(.off):is(.held, :active, :has(:focus-visible)) .well { background: var(--ctl-hover); }
  .vol:not(.off):is(.held, :active, :has(:focus-visible)) .lit { background: var(--fg); }
  .vol:not(.off):is(.held, :active, :has(:focus-visible)) :is(.pct, .lit-in .vol-row) { opacity: 1; }
  .seek:not(.off):is(.held, :active, :has(:focus-visible)) .times { opacity: 1; }
  :is(.vol, .seek):has(:focus-visible) { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 1px; border-radius: var(--r-2); }
  :is(.vol, .seek).off { opacity: 0.45; }
  :is(.vol, .seek) input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; appearance: none; background: none; z-index: 1; }
  :is(.vol, .seek) input::-webkit-slider-runnable-track { height: 100%; background: none; border: none; }
  /* A 1px native thumb, so the range maps the pointer over its full width, the same as the drawn fill. */
  :is(.vol, .seek) input::-webkit-slider-thumb { appearance: none; width: 1px; height: 100%; border: none; }
  /* The speaker's room: a hit area over the glyph, on top of the range. */
  .vol :is(input, .mute) { pointer-events: none; }
  .vol .mute { position: absolute; inset: 0 0 0 auto; width: calc(15px * var(--k) + 2 * var(--sp-2)); z-index: 2; border-radius: 0; }
  .vol .mute:focus-visible { outline: none; }

  /* Progress: the volume's swell across the centre, a smaller one (20px high). At rest a solid --now line; touched,
     the fill dims to a --now tint ending in a solid --now playhead, so the times (elapsed left, length right, --fg)
     read over it as over the well, drawn once. */
  .seek .bed { transform-origin: center; }
  .seek { --line: 0.22; position: relative; height: calc(20px * var(--k)); color: var(--fg-2); transition: color var(--m-2) var(--ease); }
  .seek .lit { background: var(--now); border-radius: 0; }
  .seek .lit::after {
    content: ""; position: absolute; top: 3px; bottom: 3px; right: 0; width: 3px; border-radius: 1.5px;
    background: var(--now); opacity: 0; transition: opacity var(--m-2) var(--ease);
  }
  .seek:not(.off):is(.held, :active, :has(:focus-visible)) .lit { background: color-mix(in srgb, var(--now) 25%, transparent); }
  .seek:not(.off):is(.held, :active, :has(:focus-visible)) .lit::after { opacity: 1; }
  .times {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 var(--sp-2);
    font-size: var(--micro-fs); font-weight: 500; font-variant-numeric: tabular-nums; line-height: 1;
    opacity: 0; transition: opacity var(--m-2) var(--ease);
  }

  /* Floating: the cover sits --sp-2 from the dock's edges on three sides (the dock's height follows, +page.svelte),
     its corner the dock's less that inset, so the two curves run side by side. */
  :global(html.player-float) .bar { padding: 0 var(--sp-4) 0 var(--sp-2); flex: none; width: 100%; }
  :global(html.player-float) :is(.cover, .cover-open) { border-radius: max(var(--r-1), calc(var(--r-3) - var(--sp-2))); }


  .note { margin-right: var(--sp-1); padding: 3px 8px; border-radius: var(--r-1); background: var(--hover); color: var(--fg-3); font-size: var(--small-fs); font-weight: 500; white-space: nowrap; }

  @media (prefers-reduced-motion: reduce) {
    button, .times, .cover-open, .vol, .bed, .lit, .lit-in, .pct, .vol-row { transition: none; }
    :is(.play, .icon):is(:hover, :active), .cover-open:active { transform: none !important; }
  }

  /* Container is .dock (the body's width). */
  @container (max-width: 760px) {
    .bar { gap: var(--sp-4); }
  }
  @container (max-width: 660px) {
    .bar { grid-template-columns: minmax(0, 1fr) minmax(200px, 1.4fr) auto; }
    .vol { display: none; }
  }
  @container (max-width: 520px) {
    .bar { grid-template-columns: minmax(0, 1fr) auto; }
    .side { display: none; }
  }
</style>
