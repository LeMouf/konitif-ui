<script lang="ts">
  export let closing = false;
  export let description: string | null = null;
  export let saveDescription = 'Crée une nouvelle révision du preset avec vos changements, puis ouvre la destination demandée.';
  export let discardDescription = 'Conserve le preset déjà enregistré, sans y intégrer les changements actuels, puis poursuit la navigation.';
  export let busy = false;
  export let error = '';
  export let layer = 1600;

  function focusGuard(node: HTMLElement) {
    const previous = document.activeElement;
    const focusable = () => Array.from(node.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    (focusable()[0] ?? node).focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const buttons = focusable();
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement;
      if (!first || !node.contains(active) || active === node ||
          (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        ((event.shiftKey ? last : first) ?? node).focus();
      }
    }
    document.addEventListener('keydown', handleKey, true);
    return {
      destroy() {
        document.removeEventListener('keydown', handleKey, true);
        queueMicrotask(() => {
          if (previous instanceof HTMLElement && previous.isConnected &&
              (document.activeElement === document.body || document.activeElement === node)) previous.focus();
        });
      }
    };
  }

  export let open = false;
  export let destinationLabel = '';
  export let workspaceModified = false;
  export let unsavedClips: readonly { id: string; title: string; action: 'create' | 'save' }[] = [];
  export let onSave: () => void = () => undefined;
  export let onSaveClip: (clipId: string) => void = () => undefined;
  export let onSaveAllClips: () => void = () => undefined;
  export let onDiscard: () => void = () => undefined;
  export let onCancel: () => void = () => undefined;
</script>

{#if open}
  <div class="workspace-transition-guard" role="presentation" style:z-index={layer}>
    <div class="workspace-transition-guard__backdrop" aria-hidden="true" on:pointerdown={() => { if (!busy) onCancel(); }}></div>
    <div
      class="workspace-transition-guard__panel"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="workspace-transition-guard-title"
      aria-describedby="workspace-transition-guard-description"
      tabindex="-1" use:focusGuard aria-busy={busy}
    >
      <header class="workspace-transition-guard__header">
        <div>
          <p class="workspace-transition-guard__eyebrow">Travail non enregistré</p>
          <h2 id="workspace-transition-guard-title">Comment souhaitez-vous poursuivre ?</h2>
        </div>
        <button class="workspace-transition-guard__close" type="button" disabled={busy} aria-label="Rester dans l’expérience" title="Fermer" on:click={onCancel}>×</button>
      </header>
      <p id="workspace-transition-guard-description">
        {#if description}
          {description}
        {:else}
          Des changements sont encore en cours. Choisissez leur devenir avant d’ouvrir
          <strong>{destinationLabel}</strong>.
        {/if}
      </p>
      {#if error}<p class="workspace-transition-guard__error" role="alert">{error}</p>{/if}
      {#if unsavedClips.length > 0}
        <section class="workspace-transition-guard__clips" aria-label="Clips modifiés non enregistrés">
          <div class="workspace-transition-guard__clips-heading">
            <strong>{unsavedClips.length} Clip{unsavedClips.length > 1 ? 's' : ''} à préserver</strong>
            <button type="button" disabled={busy} on:click={onSaveAllClips}>Tout enregistrer</button>
          </div>
          <div class="workspace-transition-guard__clip-list">
            {#each unsavedClips as clip (clip.id)}
              <div class="workspace-transition-guard__clip">
                <span><strong>{clip.title}</strong><small>{clip.action === 'save' ? 'Nouvelle révision' : 'Nouveau Clip utilisateur'}</small></span>
                <button type="button" disabled={busy} on:click={() => onSaveClip(clip.id)}>Enregistrer</button>
              </div>
            {/each}
          </div>
        </section>
      {/if}
      <div class="workspace-transition-guard__choices" role="group" aria-label="Actions de préservation">
        {#if workspaceModified}
        <button type="button" disabled={busy} class="workspace-transition-guard__choice workspace-transition-guard__choice--save" on:click={onSave}>
          <span class="workspace-transition-guard__choice-index" aria-hidden="true">01</span>
          <span class="workspace-transition-guard__choice-copy">
            <span class="workspace-transition-guard__choice-heading"><strong>{closing ? 'Enregistrer et fermer' : 'Enregistrer puis poursuivre'}</strong><small>Recommandé</small></span>
            <span>{saveDescription}</span>
          </span>
          <span class="workspace-transition-guard__choice-arrow" aria-hidden="true">→</span>
        </button>
        {/if}
        <button type="button" disabled={busy} class="workspace-transition-guard__choice workspace-transition-guard__choice--discard" on:click={onDiscard}>
          <span class="workspace-transition-guard__choice-index" aria-hidden="true">02</span>
          <span class="workspace-transition-guard__choice-copy">
            <span class="workspace-transition-guard__choice-heading"><strong>{closing ? 'Fermer sans enregistrer' : 'Poursuivre sans enregistrer'}</strong></span>
            <span>{discardDescription}</span>
          </span>
          <span class="workspace-transition-guard__choice-arrow" aria-hidden="true">→</span>
        </button>
        <button type="button" disabled={busy} class="workspace-transition-guard__choice workspace-transition-guard__choice--stay" on:click={onCancel}>
          <span class="workspace-transition-guard__choice-index" aria-hidden="true">03</span>
          <span class="workspace-transition-guard__choice-copy">
            <span class="workspace-transition-guard__choice-heading"><strong>Rester dans l’expérience</strong></span>
            <span>Ferme cette fenêtre sans enregistrer ni changer de workspace, afin de continuer votre travail.</span>
          </span>
          <span class="workspace-transition-guard__choice-arrow" aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .workspace-transition-guard { position: fixed; inset: 0; display: grid; place-items: center; padding: 24px; }
  .workspace-transition-guard__backdrop { position: absolute; inset: 0; background: rgb(1 8 14 / 74%); backdrop-filter: blur(8px); }
  .workspace-transition-guard__panel { position: relative; width: min(620px, 100%); box-sizing: border-box; display: grid; gap: 16px; padding: 26px; max-height: calc(100dvh - 48px); overflow: auto; border: 1px solid rgb(86 210 255 / 42%); border-radius: 16px; color: #eefaff; background: linear-gradient(145deg, #0d2230, #07131d 74%); box-shadow: 0 28px 90px rgb(0 0 0 / 62%); }
  .workspace-transition-guard__header { display: flex; align-items: start; justify-content: space-between; gap: 20px; }
  .workspace-transition-guard__header > div { display: grid; gap: 7px; }
  .workspace-transition-guard__eyebrow { margin: 0; color: #55d5ff; font: 800 0.68rem var(--font-mono, monospace); letter-spacing: .12em; text-transform: uppercase; }
  .workspace-transition-guard__error { color: #ffc4b7; }
  button:disabled { opacity: .55; cursor: default; }
  h2, p { margin: 0; }
  h2 { font-size: 1.45rem; }
  #workspace-transition-guard-description { color: #a8beca; line-height: 1.55; }
  #workspace-transition-guard-description strong { color: #eaf9ff; }
  button { color: inherit; font: inherit; cursor: pointer; }
  .workspace-transition-guard__close { display: grid; flex: 0 0 auto; place-items: center; width: 34px; height: 34px; padding: 0; border: 1px solid rgb(122 154 171 / 36%); border-radius: 9px; color: #b9cfda; background: rgb(255 255 255 / 4%); font-size: 1.25rem; }
  .workspace-transition-guard__close:hover, .workspace-transition-guard__close:focus-visible { border-color: rgb(86 210 255 / 66%); color: #eefaff; }
  .workspace-transition-guard__choices { display: grid; grid-template-columns: 1fr; gap: 9px; }
  .workspace-transition-guard__clips { display: grid; gap: 8px; min-height: 0; padding: 10px; border: 1px solid rgb(227 169 67 / 35%); border-radius: 11px; background: rgb(227 169 67 / 6%); }
  .workspace-transition-guard__clips-heading, .workspace-transition-guard__clip { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .workspace-transition-guard__clips-heading > button, .workspace-transition-guard__clip > button { flex: 0 0 auto; padding: 6px 10px; border: 1px solid rgb(86 210 255 / 45%); border-radius: 7px; background: rgb(86 210 255 / 9%); }
  .workspace-transition-guard__clip-list { display: grid; gap: 6px; max-height: min(30vh, 220px); overflow: auto; overscroll-behavior: contain; }
  .workspace-transition-guard__clip { padding: 8px; border-radius: 8px; background: rgb(0 0 0 / 18%); }
  .workspace-transition-guard__clip > span { min-width: 0; display: grid; gap: 2px; }
  .workspace-transition-guard__clip strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .workspace-transition-guard__clip small { color: #95abb7; }
  .workspace-transition-guard__choice { width: 100%; min-height: 86px; display: grid; grid-template-columns: 36px minmax(0, 1fr) 24px; align-items: center; gap: 13px; padding: 13px 15px; border: 1px solid rgb(122 154 171 / 24%); border-radius: 11px; color: #ddecf3; background: rgb(255 255 255 / 3%); text-align: left; transition: border-color 120ms ease, background 120ms ease, transform 120ms ease; }
  .workspace-transition-guard__choice:hover, .workspace-transition-guard__choice:focus-visible { border-color: rgb(86 210 255 / 62%); background: rgb(86 210 255 / 8%); transform: translateY(-1px); outline: none; }
  .workspace-transition-guard__choice-index { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid rgb(122 154 171 / 34%); border-radius: 50%; color: #8eacbb; font: 800 0.67rem var(--font-mono, monospace); }
  .workspace-transition-guard__choice-copy { min-width: 0; display: grid; gap: 6px; color: #95abb7; font-size: 0.79rem; line-height: 1.45; }
  .workspace-transition-guard__choice-heading { display: flex; align-items: center; gap: 9px; color: #f0f9fd; font-size: 0.92rem; }
  .workspace-transition-guard__choice-heading small { padding: 2px 6px; border-radius: 999px; color: #04202a; background: #56d2ff; font-size: 0.59rem; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
  .workspace-transition-guard__choice-arrow { color: #7796a6; font-size: 1.15rem; text-align: center; }
  .workspace-transition-guard__choice--save { border-color: rgb(86 210 255 / 45%); background: linear-gradient(90deg, rgb(86 210 255 / 12%), rgb(86 210 255 / 4%)); }
  .workspace-transition-guard__choice--save .workspace-transition-guard__choice-index,
  .workspace-transition-guard__choice--save .workspace-transition-guard__choice-arrow { border-color: rgb(86 210 255 / 55%); color: #56d2ff; }
  .workspace-transition-guard__choice--discard:hover, .workspace-transition-guard__choice--discard:focus-visible { border-color: rgb(255 151 128 / 52%); background: rgb(255 151 128 / 7%); }
  .workspace-transition-guard__choice--discard .workspace-transition-guard__choice-index { color: #ffc4b7; }
  @media (max-width: 560px) {
    .workspace-transition-guard { padding: 12px; }
    .workspace-transition-guard__panel { padding: 20px; }
    .workspace-transition-guard__choice { grid-template-columns: 30px minmax(0, 1fr); }
    .workspace-transition-guard__choice-index { width: 28px; height: 28px; }
    .workspace-transition-guard__choice-arrow { display: none; }
    .workspace-transition-guard__choice-heading { align-items: flex-start; flex-direction: column; }
  }
</style>
