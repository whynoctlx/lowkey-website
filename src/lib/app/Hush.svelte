<!-- Shown each time the demo has "played" a while: a joke about listening to silence, and the way to the real thing. -->
<script lang="ts">
  import { onMount } from "svelte";
  import { enter, exit } from "./motion.svelte";

  let { track, artist, secs, close, download }: { track: string; artist: string; secs: number; close: () => void; download: () => void } = $props();

  const jokes: ((t: string, a: string, n: number) => [string, string])[] = [
    (t, a, n) => ["You've been vibing to silence", `${n} seconds of “${t}” and not one sound. Don't bother turning it up. That's not a bug, it's a demo. The real Lowkey plays the real thing, from your own Spotify Premium.`],
    (t, a, n) => ["John Cage would be proud", `He wrote 4′33″ of silence. You gave “${t}” ${n} seconds of it before checking your speakers. He'd call that a promising start.`],
    (t, a, n) => ["Your speakers are fine", `We checked. The silence is ours: this window only pretends to play ${a}. The app on your computer actually does.`],
    (t, a, n) => ["Peak lo-fi", `No bass, no vocals, no audio at all. Just you, a moving progress bar and ${a}'s name. Some call it minimalism. We call it a demo.`],
    (t, a, n) => ["Bold of you", `Listening this hard to a web page. ${a} deserves sound, though, and so do you. That part is in the real app.`],
  ];
  const pick = jokes[Math.floor(Math.random() * jokes.length)];
  const [title, text] = $derived(pick(track, artist, secs));

  let main: HTMLButtonElement | undefined = $state();
  onMount(() => main?.focus());
</script>

<div class="scrim" aria-hidden="true" onclick={close} in:enter out:exit></div>
<div class="hush" role="dialog" aria-modal="true" aria-labelledby="hush-title" tabindex="-1" onkeydown={(e) => e.key === "Escape" && (e.stopPropagation(), close())} in:enter={{ y: 8 }} out:exit={{ y: 8, f: 0.6 }}>
  <span class="mute" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6" /></svg></span>
  <h2 id="hush-title">{title}</h2>
  <p>{text}</p>
  <div class="row">
    <button class="raised-n" onclick={close}>Keep the silence</button>
    <button class="raised" bind:this={main} onclick={() => (close(), download())}>Get the real app</button>
  </div>
</div>

<style>
  .scrim { position: absolute; inset: 0; z-index: 20; background: var(--scrim); }
  .hush {
    position: absolute; z-index: 21; left: 50%; top: 50%; translate: -50% -50%; width: min(400px, calc(100% - 2 * var(--sp-4)));
    display: flex; flex-direction: column; align-items: center; gap: var(--sp-3); padding: var(--sp-6) var(--sp-5) var(--sp-5); box-sizing: border-box;
    border-radius: var(--r-3); background: var(--glass-sheet); color: var(--fg); box-shadow: var(--shadow); text-align: center; outline: none;
    -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur);
  }
  .mute { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: var(--sunk); box-shadow: var(--sunk-edge); color: var(--accent); }
  .mute svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  h2 { margin: var(--sp-1) 0 0; font-size: 19px; font-weight: 700; letter-spacing: -0.01em; text-wrap: balance; }
  p { margin: 0; color: var(--fg-2); font-size: var(--name-fs); line-height: 1.5; text-wrap: pretty; }
  .row { display: flex; gap: var(--sp-2); margin-top: var(--sp-3); }
  .row button { height: 36px; padding: 0 18px; border-radius: 18px; font: inherit; font-size: 14px; font-weight: 600; }
  @media (max-width: 420px) { .row { flex-direction: column-reverse; align-self: stretch; } }
</style>
