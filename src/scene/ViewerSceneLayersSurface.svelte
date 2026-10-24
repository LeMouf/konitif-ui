<script lang="ts">
  import { tick } from 'svelte';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import type {
    ViewerSceneLayerGroupId,
    ViewerSceneLayerItemId,
    ViewerSceneLayerItem,
    ViewerSceneLayerOption,
    ViewerSceneLayerRevealRequest,
    ViewerSceneLayersCommandPort,
    ViewerSceneLayersSnapshot
  } from './viewerSceneLayers';

  export let title = 'Calques';
  export let snapshot: ViewerSceneLayersSnapshot;
  export let commands: ViewerSceneLayersCommandPort;
  export let revealTarget: ViewerSceneLayerRevealRequest | null = null;

  const layerGroups: readonly {
    id: ViewerSceneLayerGroupId;
    label: string;
    color: string;
  }[] = [
    { id: 'scene', label: 'Scène', color: '#45d9e9' },
    { id: 'visualEffects', label: 'Effets visuels', color: '#a78bfa' },
    { id: 'debug', label: 'Debug', color: '#f5b942' }
  ];

  let expandedItems: ViewerSceneLayerItemId[] = ['camera', 'sceneLighting', 'sceneEnvironment', 'visualGround', 'fog'];
  let expandedGroups: ViewerSceneLayerGroupId[] = ['scene', 'visualEffects'];
  let expandedOptions: string[] = [];
  let surfaceElement: HTMLElement | null = null;
  let handledRevealRequestId = -1;
  let acknowledgedRevealRequestId = -1;

  $: if (revealTarget && revealTarget.requestId !== handledRevealRequestId) {
    handledRevealRequestId = revealTarget.requestId;
    void revealSceneLayerTarget(revealTarget);
  }

  $: groupedLayerGroups = layerGroups.map((group) => ({
    ...group,
    items: snapshot.items.filter((item) => item.group === group.id)
  })).filter(group => group.items.length > 0);

  function toggleExpanded(id: ViewerSceneLayerItemId): void {
    expandedItems = expandedItems.includes(id)
      ? expandedItems.filter((expandedId) => expandedId !== id)
      : [...expandedItems, id];
  }

  function toggleGroup(id: ViewerSceneLayerGroupId): void {
    expandedGroups = expandedGroups.includes(id)
      ? expandedGroups.filter((expandedId) => expandedId !== id)
      : [...expandedGroups, id];
  }

  function optionKey(itemId: ViewerSceneLayerItemId, optionId: string): string {
    return `${itemId}:${optionId}`;
  }

  function toggleOptionExpanded(itemId: ViewerSceneLayerItemId, optionId: string): void {
    const key = optionKey(itemId, optionId);
    expandedOptions = expandedOptions.includes(key)
      ? expandedOptions.filter((expandedKey) => expandedKey !== key)
      : [...expandedOptions, key];
  }

  function headerActions(item: ViewerSceneLayerItem) {
    return item.options?.filter((option) => option.kind === 'action') ?? [];
  }

  function contentOptions(item: ViewerSceneLayerItem) {
    return item.options?.filter((option) => option.kind !== 'action' && !option.configurationOf) ?? [];
  }

  function configurationOption(
    item: ViewerSceneLayerItem,
    option: ViewerSceneLayerOption
  ): ViewerSceneLayerOption {
    return item.options?.find((candidate) => candidate.configurationOf === option.id) ?? option;
  }
  function resetGroup(items: readonly ViewerSceneLayerItem[]): void {
    for (const item of items) {
      for (const action of headerActions(item)) {
        if (!action.disabled) commands.toggleOption(item.id, action.id);
      }
    }
  }


  function inputValue(event: Event): number {
    return Number((event.currentTarget as HTMLInputElement).value);
  }

  function isRevealHighlighted(
    itemId: ViewerSceneLayerItemId,
    optionId: string,
    controlId: string
  ): boolean {
    return revealTarget !== null &&
      revealTarget.requestId !== acknowledgedRevealRequestId &&
      revealTarget.itemId === itemId &&
      revealTarget.optionId === optionId &&
      revealTarget.controlId === controlId;
  }

  function acknowledgeRevealHighlight(
    itemId: ViewerSceneLayerItemId,
    optionId: string,
    controlId: string
  ): void {
    if (isRevealHighlighted(itemId, optionId, controlId) && revealTarget) {
      acknowledgedRevealRequestId = revealTarget.requestId;
    }
  }

  async function revealSceneLayerTarget(target: ViewerSceneLayerRevealRequest): Promise<void> {
    const item = snapshot.items.find((candidate) => candidate.id === target.itemId);
    if (!item) return;
    if (!expandedGroups.includes(item.group)) expandedGroups = [...expandedGroups, item.group];
    if (!expandedItems.includes(item.id)) expandedItems = [...expandedItems, item.id];
    if (target.optionId) {
      const key = optionKey(item.id, target.optionId);
      if (!expandedOptions.includes(key)) expandedOptions = [...expandedOptions, key];
    }
    await tick();
    const selector = target.controlId
      ? `[data-layer-anchor="${item.id}:${target.optionId ?? ''}:${target.controlId}"]`
      : `[data-layer-item="${item.id}"]`;
    surfaceElement?.querySelector<HTMLElement>(selector)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
</script>

<section class="scene-layers" aria-label={title} bind:this={surfaceElement}>
  <header>
    <div>
      <small>Scène 3D</small>
      <strong>{title}</strong>
    </div>
    <span>{snapshot.items.filter((item) => item.active).length}/{snapshot.items.length}</span>
  </header>

  <p class="scene-layers__notice">Affichage local du Viewer · les réglages restent enregistrés avec la vue.</p>

  <div class="scene-layers__list">
    {#each groupedLayerGroups as group (group.id)}
      <section
        class="scene-layers__group"
        style={"--layer-group-color:" + group.color}
        aria-label={group.label}
      >
        <div class="scene-layers__group-heading">
          <button
            type="button"
            class="scene-layers__group-label"
            aria-expanded={expandedGroups.includes(group.id)}
            aria-controls={`scene-layers-group-${group.id}`}
            on:click={() => toggleGroup(group.id)}
          ><strong>{group.label}</strong></button>
          <span class="scene-layers__group-actions">
            <small>{group.items.filter((item) => item.active).length}/{group.items.length}</small>
            {#if group.items.some((item) => headerActions(item).length > 0)}
              <button
                type="button"
                class="scene-layers__group-reset"
                disabled={!snapshot.canEdit || !group.items.some((item) => headerActions(item).some((action) => !action.disabled))}
                aria-label={`Réinitialiser ${group.label}`}
                title={`Réinitialiser ${group.label}`}
                on:click={() => resetGroup(group.items)}
              ><WorkbenchIcon icon="action.reset" label="" /></button>
            {/if}
            <button
              type="button"
              class="scene-layers__group-toggle"
              aria-expanded={expandedGroups.includes(group.id)}
              aria-controls={`scene-layers-group-${group.id}`}
              aria-label={`Afficher ou masquer ${group.label}`}
              on:click={() => toggleGroup(group.id)}
            ><i aria-hidden="true">⌄</i></button>
          </span>
        </div>
        {#if expandedGroups.includes(group.id)}
        <div class="scene-layers__group-items scene-layers__tree-branch" id={`scene-layers-group-${group.id}`}>
          {#each group.items as item (item.id)}
      <div class="scene-layers__tree-item">
      <article class:active={item.active} data-layer-item={item.id}>
        <div class="scene-layers__row">
          <button
            type="button"
            class="scene-layers__item"
            class:active={item.active}
            aria-pressed={item.configOnly ? undefined : item.active}
            aria-expanded={item.configOnly ? expandedItems.includes(item.id) : undefined}
            disabled={!snapshot.canEdit || item.disabled}
            title={item.description}
            on:click={() => item.configOnly ? toggleExpanded(item.id) : commands.toggleItem(item.id)}
          >
            <span class="scene-layers__eye" aria-hidden="true">{item.configOnly ? '◈' : item.active ? '●' : '○'}</span>
            <span><strong>{item.label}</strong><small>{item.description}</small></span>
          </button>
          {#each headerActions(item) as action (action.id)}
            <button
              type="button"
              class="scene-layers__header-action"
              disabled={!snapshot.canEdit || action.disabled}
              aria-label={action.label}
              title={action.label}
              on:click={() => commands.toggleOption(item.id, action.id)}
            ><WorkbenchIcon icon={action.icon ?? 'action.reset'} label="" /></button>
          {/each}
          {#if contentOptions(item).length}
            <button
              type="button"
              class="scene-layers__expand"
              class:active={expandedItems.includes(item.id)}
              aria-expanded={expandedItems.includes(item.id)}
              title={`Options ${item.label}`}
              on:click={() => toggleExpanded(item.id)}
            ><span aria-hidden="true">⌄</span></button>
          {/if}
        </div>

        {#if contentOptions(item).length && expandedItems.includes(item.id)}
          <div class="scene-layers__options" aria-label={`Options ${item.label}`}>
            {#each contentOptions(item) as option (option.id)}
              <div
                class="scene-layers__option"
                class:configured={configurationOption(item, option) !== option}
                class:expanded={expandedOptions.includes(optionKey(item.id, configurationOption(item, option).id))}
              >
                <div class="scene-layers__option-row">
                  <button
                    type="button"
                    class="scene-layers__option-toggle"
                    class:active={option.active}
                    class:action={option.kind === 'action'}
                    aria-pressed={option.kind === 'toggle' || !option.kind ? option.active : undefined}
                    disabled={!snapshot.canEdit || option.disabled}
                    on:click={() => option.kind === 'control'
                      ? toggleOptionExpanded(item.id, configurationOption(item, option).id)
                      : commands.toggleOption(item.id, option.id)}
                  >
                    {#if option.kind !== 'action'}<span aria-hidden="true"></span>{/if}{option.label}
                  </button>
                  {#if configurationOption(item, option).controls?.length || configurationOption(item, option).toggles?.length}
                    <button
                      type="button"
                      class="scene-layers__option-expand"
                      class:active={expandedOptions.includes(optionKey(item.id, configurationOption(item, option).id))}
                      aria-expanded={expandedOptions.includes(optionKey(item.id, configurationOption(item, option).id))}
                      aria-label={configurationOption(item, option).label}
                      title={configurationOption(item, option).label}
                      on:click={() => toggleOptionExpanded(item.id, configurationOption(item, option).id)}
                    ><span aria-hidden="true">⌄</span></button>
                  {/if}
                </div>
                {#if (configurationOption(item, option).controls?.length || configurationOption(item, option).toggles?.length) && expandedOptions.includes(optionKey(item.id, configurationOption(item, option).id))}
                  <div class="scene-layers__option-controls">
                    {#if configurationOption(item, option).summary}
                      <div class="scene-layers__option-summary">{configurationOption(item, option).label}<output>{configurationOption(item, option).summary}</output></div>
                    {/if}
                    {#each configurationOption(item, option).controls ?? [] as control (control.id)}
                      <div
                        role="group"
                        aria-label={control.label}
                        class="scene-layers__numeric-control"
                        class:has-scene-cycle={Boolean(control.sceneCycle)}
                        class:scene-cycle-engaged={control.sceneCycle?.engaged}
                        class:revealed={revealTarget !== null && revealTarget.requestId !== acknowledgedRevealRequestId && revealTarget.itemId === item.id && revealTarget.optionId === configurationOption(item, option).id && revealTarget.controlId === control.id}
                        data-layer-anchor={`${item.id}:${configurationOption(item, option).id}:${control.id}`}
                        style={control.sceneCycle ? `--scene-cycle-color:${control.sceneCycle.color}` : undefined}
                        on:pointerenter={() => acknowledgeRevealHighlight(item.id, configurationOption(item, option).id, control.id)}
                      >
                        {#if control.sceneCycle}
                          <button
                            type="button"
                            class="scene-layers__cycle-subscription"
                            class:active={control.sceneCycle.engaged}
                            aria-pressed={control.sceneCycle.engaged}
                            aria-label={`${control.sceneCycle.engaged ? 'Désabonner' : 'Abonner'} ${control.label} au cycle de scène`}
                            title={control.sceneCycle.engaged ? 'Piloté par le cycle de scène' : 'Abonner au cycle de scène'}
                            disabled={!snapshot.canEdit || configurationOption(item, option).disabled}
                            on:click={() => commands.toggleOptionValueSceneCycle(item.id, configurationOption(item, option).id, control.id)}
                          ><span aria-hidden="true">⌁</span></button>
                        {/if}
                        <div class="scene-layers__numeric-body">
                          <div class="scene-layers__numeric-heading">
                            <span class="scene-layers__numeric-label">
                              {control.label}
                              {#if control.sceneCycle?.engaged}
                                <i title="Autorité déléguée au cycle de scène">
                                  <WorkbenchIcon icon="action.lock" label="" />
                                </i>
                              {/if}
                            </span>
                            <output>{control.value.toFixed(control.step < 0.01 ? 3 : 2)}{control.suffix ?? ''}</output>
                          </div>
                          <input
                            type="range"
                            aria-label={control.label}
                            min={control.min}
                            max={control.max}
                            step={control.step}
                            value={control.value}
                            disabled={!snapshot.canEdit || configurationOption(item, option).disabled || control.readOnly || control.sceneCycle?.engaged}
                            aria-readonly={control.readOnly || control.sceneCycle?.engaged || false}
                            on:input={(event) => commands.setOptionValue(item.id, configurationOption(item, option).id, control.id, inputValue(event), false)}
                            on:change={(event) => commands.setOptionValue(item.id, configurationOption(item, option).id, control.id, inputValue(event), true)}
                          />
                        </div>
                      </div>
                    {/each}
                    {#if configurationOption(item, option).toggles?.length}
                      <div class="scene-layers__toggle-controls">
                        {#each configurationOption(item, option).toggles ?? [] as control (control.id)}
                          <button
                            type="button"
                            class="scene-layers__toggle-control"
                            class:active={control.active}
                            aria-pressed={control.active}
                            disabled={!snapshot.canEdit || configurationOption(item, option).disabled || control.disabled}
                            on:click={() => commands.toggleOptionControl(item.id, configurationOption(item, option).id, control.id)}
                          ><span aria-hidden="true"></span>{control.label}</button>
                        {/each}
                      </div>
                    {/if}
                    {#if configurationOption(item, option).metrics?.length}
                      <div class="scene-layers__option-metrics">
                        {#each configurationOption(item, option).metrics ?? [] as metric (metric.label)}
                          <span title={metric.title}>{metric.label} <output>{metric.value}</output></span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </article>
      </div>
          {/each}
        </div>
        {/if}
      </section>
    {/each}
  </div>
</section>

<style>
  .scene-layers{box-sizing:border-box;display:grid;align-content:start;gap:12px;width:100%;height:100%;min-height:0;padding:12px;overflow:auto;background:linear-gradient(160deg,color-mix(in srgb,var(--layer-group-color,var(--color-accent-primary,#45d9e9)) 3%,transparent),transparent 42%),linear-gradient(var(--color-background-surface,#071522),var(--color-background-surface,#071522)),#071522;color:var(--color-text-primary,#d9ebf7);font:12px/1.35 system-ui,sans-serif}
  header{display:flex;align-items:center;justify-content:space-between;gap:10px}header>div{display:grid;gap:1px}header small{color:var(--color-text-muted,#7f9db2);font-size:9px;letter-spacing:.08em}header strong{font-size:13px}header>span{padding:4px 7px;border:1px solid color-mix(in srgb,var(--layer-group-color,var(--color-accent-primary,#45d9e9)) 55%,transparent);border-radius:999px;color:var(--layer-group-color,var(--color-accent-primary,#71deee));font:10px ui-monospace,monospace}
  .scene-layers__notice{margin:0;padding:8px;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 55%,transparent);border-radius:7px;color:var(--color-text-muted,#7f9db2);font-size:10px}
  .scene-layers__list{display:grid;gap:14px}
  .scene-layers__group{display:grid;gap:6px;min-width:0}
  .scene-layers__group-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:32px;padding:0 0 5px 8px;border-left:2px solid var(--layer-group-color);color:var(--layer-group-color)}
  .scene-layers__group-heading strong{font-size:9px;letter-spacing:.1em;text-transform:uppercase}
  .scene-layers__group-heading .scene-layers__group-label{display:flex;align-self:stretch;align-items:center;flex:1 1 auto;justify-content:flex-start;min-width:0;width:auto;height:auto;padding:0 8px;border-radius:6px;text-align:left;transition:color 140ms ease,background 140ms ease,box-shadow 140ms ease}
  .scene-layers__group-heading .scene-layers__group-label:hover{color:var(--layer-group-color);background:color-mix(in srgb,var(--layer-group-color) 8%,transparent)}
  .scene-layers__group-heading small{display:grid;place-items:center;align-self:stretch;min-width:32px;padding:0 6px;border-right:1px solid color-mix(in srgb,var(--layer-group-color) 22%,transparent);color:color-mix(in srgb,var(--layer-group-color) 74%,var(--color-text-muted,#7f9db2));font:9px ui-monospace,monospace}
  .scene-layers__group-actions{display:flex;align-items:center;min-height:30px;padding:2px;border:1px solid color-mix(in srgb,var(--layer-group-color) 28%,var(--color-border-strong,#31536a));border-radius:8px;background:color-mix(in srgb,var(--color-background-canvas,#06111c) 74%,transparent);box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 4%,transparent),0 4px 14px rgb(0 0 0 / .12)}
  .scene-layers__group-actions button{display:grid;place-items:center;width:27px;height:27px;border-radius:5px;color:color-mix(in srgb,var(--layer-group-color) 78%,var(--color-text-muted,#7f9db2));transition:color 140ms ease,background 140ms ease,box-shadow 140ms ease}
  .scene-layers__group-heading button:hover:not(:disabled){color:var(--layer-group-color);background:color-mix(in srgb,var(--layer-group-color) 12%,transparent)}
  .scene-layers__group-heading button:focus-visible{outline:0;box-shadow:inset 0 0 0 1px var(--layer-group-color),0 0 0 2px color-mix(in srgb,var(--layer-group-color) 18%,transparent)}
  .scene-layers__group-reset{margin-left:2px}
  .scene-layers__group-toggle i{display:block;font-size:12px;font-style:normal;line-height:1;transition:transform 140ms ease}
  .scene-layers__group-toggle[aria-expanded='true'] i{transform:rotate(180deg)}
  .scene-layers__group-items{display:grid;gap:7px}
  .scene-layers__tree-branch{position:relative;margin-left:8px;padding-left:16px}
  .scene-layers__tree-branch::before{position:absolute;top:-6px;bottom:0;left:0;border-left:1px dotted color-mix(in srgb,var(--layer-group-color) 56%,transparent);content:'';pointer-events:none}
  .scene-layers__tree-item{position:relative;min-width:0}
  .scene-layers__list article{overflow:hidden;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 72%,transparent);border-radius:8px;background:color-mix(in srgb,var(--color-background-panel,#0a1826) 84%,transparent)}.scene-layers__list article.active{border-color:color-mix(in srgb,var(--layer-group-color,var(--color-accent-primary,#45d9e9)) 66%,transparent)}
  .scene-layers__tree-item::before{position:absolute;z-index:1;top:-7px;left:-17px;width:16px;height:31px;border-bottom:1px dotted color-mix(in srgb,var(--layer-group-color) 56%,transparent);border-left:1px dotted color-mix(in srgb,var(--layer-group-color) 56%,transparent);border-radius:0 0 0 8px;content:'';pointer-events:none}
  .scene-layers__tree-item:last-child::after{position:absolute;z-index:1;top:24px;bottom:-7px;left:-17px;width:3px;background:var(--color-background-surface,#071522);content:'';pointer-events:none}
  .scene-layers__row{display:flex;align-items:stretch;min-height:48px}.scene-layers button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}.scene-layers button:disabled{cursor:not-allowed;opacity:.45}.scene-layers__item{flex:1 1 auto;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:9px;min-width:0;padding:9px;text-align:left}.scene-layers__item>span:last-child{display:grid;gap:1px;min-width:0}.scene-layers__item strong{font-size:11px}.scene-layers__item small{overflow:hidden;color:var(--color-text-muted,#7f9db2);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.scene-layers__eye{color:var(--color-text-muted,#7f9db2);font-size:13px}.scene-layers__item.active .scene-layers__eye{color:var(--layer-group-color,var(--color-accent-primary,#45d9e9));text-shadow:0 0 8px color-mix(in srgb,var(--layer-group-color,var(--color-accent-primary,#45d9e9)) 75%,transparent)}
  .scene-layers__header-action,.scene-layers__expand{position:relative;flex:0 0 36px;width:36px;border-left:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 48%,transparent)!important;background:linear-gradient(180deg,color-mix(in srgb,var(--color-background-panel,#0a1826) 94%,#fff 2%),color-mix(in srgb,var(--color-background-canvas,#06111c) 88%,transparent))!important;transition:color 140ms ease,background 140ms ease,box-shadow 140ms ease}
  .scene-layers__header-action{display:grid;place-items:center;color:color-mix(in srgb,var(--layer-group-color,var(--color-accent-primary,#45d9e9)) 82%,var(--color-text-muted,#7f9db2))!important}
  .scene-layers__header-action:hover:not(:disabled),.scene-layers__expand:hover:not(:disabled){color:var(--layer-group-color,var(--color-accent-primary,#45d9e9))!important;background:color-mix(in srgb,var(--layer-group-color,var(--color-accent-primary,#45d9e9)) 10%,var(--color-background-panel,#0a1826))!important}
  .scene-layers__header-action:focus-visible,.scene-layers__expand:focus-visible{z-index:1;outline:0;box-shadow:inset 0 0 0 1px var(--layer-group-color,var(--color-accent-primary,#45d9e9)),0 0 0 2px color-mix(in srgb,var(--layer-group-color,var(--color-accent-primary,#45d9e9)) 16%,transparent)}
  .scene-layers__expand{color:var(--color-text-muted,#7f9db2)!important}.scene-layers__expand.active{color:var(--layer-group-color,var(--color-accent-primary,#45d9e9))!important;background:color-mix(in srgb,var(--layer-group-color,var(--color-accent-primary,#45d9e9)) 7%,var(--color-background-panel,#0a1826))!important}.scene-layers__expand>span,.scene-layers__option-expand>span{display:inline-block;font-size:12px;line-height:1;transition:transform 140ms ease}.scene-layers__expand.active>span,.scene-layers__option-expand.active>span{transform:rotate(180deg)}
  .scene-layers__option-summary,.scene-layers__option-metrics{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--color-text-muted,#7f9db2);font-size:9px}.scene-layers__option-summary{padding-bottom:2px;color:var(--color-text-primary,#d9ebf7);font-weight:600}.scene-layers__option-metrics span{display:flex;align-items:center;gap:4px}
  .scene-layers__options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:8px;border-top:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 48%,transparent);background:rgb(255 255 255 / .05)}.scene-layers__option{min-width:0}.scene-layers__option.configured,.scene-layers__option.expanded{grid-column:1/-1}.scene-layers__option-row{display:grid;grid-template-columns:minmax(0,1fr) auto}.scene-layers__option-row button{display:flex;align-items:center;gap:6px;min-width:0;padding:6px;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 68%,transparent);border-radius:6px;text-align:left;font-size:9px}.scene-layers__option-row .scene-layers__option-expand{width:27px;justify-content:center;border-left:0;border-radius:0 6px 6px 0}.scene-layers__option-row:has(.scene-layers__option-expand) .scene-layers__option-toggle{border-radius:6px 0 0 6px}.scene-layers__option-toggle>span{flex:0 0 auto;width:6px;height:6px;border-radius:50%;background:var(--color-text-muted,#7f9db2)}.scene-layers__option-row button.active{border-color:var(--layer-group-color,var(--color-accent-primary,#45d9e9));color:var(--layer-group-color,var(--color-accent-primary,#71deee));background:color-mix(in srgb,var(--layer-group-color,var(--color-accent-primary,#45d9e9)) 9%,transparent)}.scene-layers__option-row:has(.scene-layers__option-toggle.active) .scene-layers__option-expand{border-color:var(--layer-group-color,var(--color-accent-primary,#45d9e9));color:var(--layer-group-color,var(--color-accent-primary,#71deee))}.scene-layers__option-toggle.active>span{background:var(--layer-group-color,var(--color-accent-primary,#45d9e9));box-shadow:0 0 6px var(--layer-group-color,var(--color-accent-primary,#45d9e9))}
  .scene-layers__option-toggle.action{justify-content:center}
  .scene-layers__option-controls{display:grid;gap:8px;padding:9px;margin-top:4px;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 58%,transparent);border-radius:6px;background:color-mix(in srgb,var(--color-background-canvas,#06111c) 68%,transparent)}
  .scene-layers__toggle-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.scene-layers__toggle-control{display:flex;align-items:center;gap:6px;min-width:0;padding:6px!important;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 68%,transparent)!important;border-radius:6px!important;text-align:left;font-size:9px!important}.scene-layers__toggle-control>span{flex:0 0 auto;width:6px;height:6px;border-radius:50%;background:var(--color-text-muted,#7f9db2)}.scene-layers__toggle-control.active{border-color:var(--layer-group-color,var(--color-accent-primary,#45d9e9))!important;color:var(--layer-group-color,var(--color-accent-primary,#71deee));background:color-mix(in srgb,var(--layer-group-color,var(--color-accent-primary,#45d9e9)) 9%,transparent)!important}.scene-layers__toggle-control.active>span{background:var(--layer-group-color,var(--color-accent-primary,#45d9e9));box-shadow:0 0 6px var(--layer-group-color,var(--color-accent-primary,#45d9e9))}
  .scene-layers__numeric-control{display:grid;gap:4px}.scene-layers__numeric-control.has-scene-cycle{position:relative;isolation:isolate;grid-template-columns:24px minmax(0,1fr);gap:7px;padding:5px;overflow:hidden;border:1px solid transparent;border-radius:6px;transition:border-color 140ms ease,background 140ms ease,box-shadow 140ms ease}.scene-layers__numeric-control.has-scene-cycle>*{position:relative;z-index:1}.scene-layers__numeric-control.revealed{border-color:color-mix(in srgb,var(--scene-cycle-color,var(--layer-group-color,#45d9e9)) 42%,transparent);background:color-mix(in srgb,var(--scene-cycle-color,var(--layer-group-color,#45d9e9)) 10%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--scene-cycle-color,var(--layer-group-color,#45d9e9)) 18%,transparent)}.scene-layers__numeric-control.scene-cycle-engaged{border-color:color-mix(in srgb,var(--scene-cycle-color) 34%,transparent);background:color-mix(in srgb,var(--scene-cycle-color) 7%,transparent)}.scene-layers__numeric-control.scene-cycle-engaged::after{position:absolute;z-index:0;inset:0;background:repeating-linear-gradient(135deg,rgb(255 255 255 / .3) 0 8px,transparent 8px 16px);background-size:23px 23px;content:'';opacity:0;pointer-events:none;animation:scene-cycle-barber-fade 11s ease-in-out forwards,scene-cycle-barber-slide .8s linear infinite}.scene-layers__numeric-control.scene-cycle-engaged:hover::after{opacity:1;animation:scene-cycle-barber-slide .8s linear infinite;transition:opacity .5s ease}.scene-layers__numeric-body{display:grid;gap:4px;min-width:0}.scene-layers__numeric-heading{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:7px;color:var(--color-text-muted,#7f9db2);font-size:9px}.scene-layers__numeric-label{display:flex;align-items:center;gap:5px;min-width:0}.scene-layers__numeric-label i{display:grid;place-items:center;flex:0 0 auto;width:12px;height:12px;color:var(--scene-cycle-color);font-style:normal}.scene-layers__numeric-label i :global(.workbench-icon),.scene-layers__numeric-label i :global(svg){width:10px;height:10px}.scene-layers__option-controls output{color:var(--layer-group-color,var(--color-accent-primary,#71deee));font:9px ui-monospace,monospace}.scene-layers__numeric-control input{width:100%;accent-color:var(--layer-group-color,var(--color-accent-primary,#45d9e9))}.scene-layers__numeric-control.scene-cycle-engaged .scene-layers__numeric-heading{color:color-mix(in srgb,var(--scene-cycle-color) 78%,var(--color-text-primary,#d9ebf7))}.scene-layers__numeric-control.scene-cycle-engaged input{accent-color:var(--scene-cycle-color);cursor:not-allowed;opacity:.72}.scene-layers__numeric-control.scene-cycle-engaged output{color:var(--scene-cycle-color)}
  .scene-layers__cycle-subscription{align-self:stretch;display:grid!important;place-items:center;width:24px;min-height:42px;padding:0!important;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 70%,transparent)!important;border-radius:5px!important;color:var(--color-text-muted,#7f9db2)!important;background:color-mix(in srgb,var(--color-background-panel,#0a1826) 72%,transparent)!important}.scene-layers__cycle-subscription.active{border-color:var(--scene-cycle-color)!important;color:var(--scene-cycle-color)!important;background:color-mix(in srgb,var(--scene-cycle-color) 13%,var(--color-background-panel,#0a1826))!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--scene-cycle-color) 14%,transparent),0 0 8px color-mix(in srgb,var(--scene-cycle-color) 18%,transparent)}
  .scene-layers__numeric-control.scene-cycle-engaged:not(.revealed)::after{content:none;animation:none}
  .scene-layers__numeric-control.revealed::after{position:absolute;z-index:0;inset:0;background:repeating-linear-gradient(135deg,rgb(255 255 255 / .3) 0 8px,transparent 8px 16px);background-size:23px 23px;content:'';opacity:0;pointer-events:none;animation:scene-cycle-barber-fade 6s ease-in-out forwards,scene-cycle-barber-slide .8s linear infinite}
  .scene-layers__numeric-control.revealed:hover::after{opacity:0;animation:none;transition:opacity 120ms ease}
  @keyframes scene-cycle-barber-fade{0%{opacity:0}8.33%,91.67%{opacity:1}100%{opacity:0}}
  @keyframes scene-cycle-barber-slide{to{background-position:23px 0}}
  @media(prefers-reduced-motion:reduce){.scene-layers__numeric-control.revealed::after{animation:scene-cycle-barber-fade 6s ease-in-out forwards}}
</style>
