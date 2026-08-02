'use strict';

/* ============================================================================
   Asteris Appearance
   ----------------------------------------------------------------------------
   Drives the Asteris theme. Writes body classes and a handful of CSS custom
   properties; all visual rules live in the theme itself.
   Plain CommonJS on purpose, so the plugin needs no build step.
   ========================================================================== */

const obsidian = require('obsidian');

/* ---------------------------------------------------------------- presets */

const PRESETS = [
  { id: 'deep',      name: 'Deep',      dark: true,  hint: 'Cool graphite. The default.', swatch: ['#14161c', '#191c23', '#936bf0'] },
  { id: 'midnight',  name: 'Midnight',  dark: true,  hint: 'Deep navy, cyan accent.',     swatch: ['#0f1724', '#141d2c', '#36d3f2'] },
  { id: 'graphite',  name: 'Graphite',  dark: true,  hint: 'Warm neutral, amber accent.', swatch: ['#1a1917', '#201f1c', '#f7a93b'] },
  { id: 'nocturne',  name: 'Nocturne',  dark: true,  hint: 'Forest black, mint accent.',  swatch: ['#111815', '#161e1a', '#3edaa1'] },
  { id: 'plum',      name: 'Plum',      dark: true,  hint: 'Aubergine, rose accent.',     swatch: ['#17131d', '#1d1824', '#ed6ead'] },
  { id: 'void',      name: 'Void',      dark: true,  hint: 'True black for OLED.',        swatch: ['#000000', '#0b0b0b', '#47a3ff'] },
  { id: 'daylight',  name: 'Daylight',  dark: false, hint: 'Clean cool white.',           swatch: ['#ffffff', '#f4f6f9', '#1d73ed'] },
  { id: 'parchment', name: 'Parchment', dark: false, hint: 'Warm paper, ink brown.',      swatch: ['#faf7f0', '#f2ede2', '#b6622b'] },
];

const PRESET_BY_ID = Object.fromEntries(PRESETS.map((p) => [p.id, p]));

const DEFAULTS = {
  // palette
  preset: 'deep',
  accentOverride: false,
  accentColor: '#936bf0',
  syncBaseScheme: true,
  roundness: 'medium',

  // typography
  editorFont: 'sans',
  headingStyle: 'modern',
  fontSize: 17,
  lineHeight: 1.62,
  lineWidth: 46,
  density: 'comfortable',

  // simplify
  hideRibbon: false,
  ribbonHover: true,
  hideVaultName: false,
  hideStatusBar: false,
  statusBarHover: true,
  hideSingleTab: false,
  hideViewHeader: false,
  cleanNav: true,
  hideScrollbars: true,
  dimInactivePanes: false,
  focusMode: false,
  noDividers: false,

  // motion
  animations: true,
  animSpeed: 1,
  animHover: true,
  animTabs: true,
  animModals: true,
  animMicro: true,
  animSidebar: true,
  respectReducedMotion: true,

  // transient
  zen: false,
};

/* ------------------------------------------------------------------ colour */

function hexToHsl(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex).trim());
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/* ------------------------------------------------------------------ plugin */

class AsterisAppearance extends obsidian.Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.settings.zen = false; // never persist zen across restarts

    this.addSettingTab(new AsterisSettingTab(this.app, this));

    this.addRibbonIcon('palette', 'Asteris appearance', () => {
      new AsterisQuickPanel(this.app, this).open();
    });

    this.addCommand({
      id: 'open-quick-panel',
      name: 'Open appearance panel',
      callback: () => new AsterisQuickPanel(this.app, this).open(),
    });

    this.addCommand({
      id: 'next-preset',
      name: 'Next colour preset',
      callback: () => {
        const i = PRESETS.findIndex((p) => p.id === this.settings.preset);
        const next = PRESETS[(i + 1) % PRESETS.length];
        this.setPreset(next.id);
        new obsidian.Notice('Asteris: ' + next.name);
      },
    });

    this.addCommand({
      id: 'toggle-animations',
      name: 'Toggle animations',
      callback: () => {
        this.settings.animations = !this.settings.animations;
        this.saveAndApply();
        new obsidian.Notice('Animations ' + (this.settings.animations ? 'on' : 'off'));
      },
    });

    this.addCommand({
      id: 'toggle-focus-mode',
      name: 'Toggle focus mode',
      callback: () => {
        this.settings.focusMode = !this.settings.focusMode;
        this.saveAndApply();
      },
    });

    this.addCommand({
      id: 'toggle-zen-mode',
      name: 'Toggle zen mode',
      callback: () => {
        this.settings.zen = !this.settings.zen;
        this.apply();
        new obsidian.Notice('Zen mode ' + (this.settings.zen ? 'on' : 'off'));
      },
    });

    this.app.workspace.onLayoutReady(() => {
      this.apply();
      this.warnIfThemeInactive();
    });
    this.apply();
  }

  onunload() {
    this.clearBodyClasses();
    const s = document.body.style;
    ['--as-font-size', '--as-line-height', '--as-line-width', '--as-dur-scale',
      '--as-accent-h', '--as-accent-s', '--as-accent-l'].forEach((v) => s.removeProperty(v));
  }

  /* -------------------------------------------------------------- helpers */

  async saveAndApply() {
    await this.saveData(this.settings);
    this.apply();
  }

  setPreset(id) {
    this.settings.preset = id;
    const p = PRESET_BY_ID[id];
    if (p && !this.settings.accentOverride) this.settings.accentColor = p.swatch[2];
    this.saveAndApply();
  }

  clearBodyClasses() {
    const body = document.body;
    Array.from(body.classList)
      .filter((c) => c.indexOf('asteris-') === 0)
      .forEach((c) => body.classList.remove(c));
  }

  warnIfThemeInactive() {
    // Default to the happy value so a failed private-API lookup never nags.
    let active = 'Asteris';
    try {
      active = this.app.customCss.theme;
    } catch (e) { /* private API, best effort */ }
    if (active !== 'Asteris') {
      new obsidian.Notice(
        'Asteris Appearance needs the Asteris theme.\n' +
        'Settings > Appearance > Themes > Asteris.',
        8000
      );
    }
  }

  syncBaseScheme() {
    const p = PRESET_BY_ID[this.settings.preset];
    if (!p || !this.settings.syncBaseScheme) return;
    const wanted = p.dark ? 'obsidian' : 'moonstone';
    try {
      if (this.app.vault.getConfig('theme') !== wanted) {
        this.app.vault.setConfig('theme', wanted);
        this.app.workspace.trigger('css-change');
      }
    } catch (e) {
      // Private API changed. Fall back to the body class, which is enough for
      // this theme; only Obsidian's own syntax colours may lag behind.
      document.body.classList.toggle('theme-dark', p.dark);
      document.body.classList.toggle('theme-light', !p.dark);
    }
  }

  /* ---------------------------------------------------------------- apply */

  apply() {
    const s = this.settings;
    const body = document.body;
    const zen = s.zen;

    this.clearBodyClasses();

    const on = [];
    const add = (cond, cls) => { if (cond) on.push(cls); };

    on.push('asteris-preset-' + s.preset);
    on.push('asteris-round-' + s.roundness);
    on.push('asteris-font-' + s.editorFont);
    on.push('asteris-heading-' + s.headingStyle);
    on.push('asteris-density-' + s.density);

    // simplify (zen forces the chrome-hiding set on, without saving it)
    add(zen || s.hideRibbon, 'asteris-hide-ribbon');
    add((zen || s.hideRibbon) && s.ribbonHover, 'asteris-ribbon-hover');
    add(zen || s.hideVaultName, 'asteris-hide-vault');
    add(zen || s.hideStatusBar, 'asteris-hide-status');
    add((zen || s.hideStatusBar) && s.statusBarHover, 'asteris-status-hover');
    add(zen || s.hideSingleTab, 'asteris-hide-tabbar-single');
    add(zen || s.hideViewHeader, 'asteris-hide-viewheader');
    add(zen || s.noDividers, 'asteris-no-dividers');
    add(s.cleanNav, 'asteris-clean-nav');
    add(s.hideScrollbars, 'asteris-hide-scrollbars');
    add(zen || s.dimInactivePanes, 'asteris-dim-panes');
    add(zen || s.focusMode, 'asteris-focus');
    add(zen, 'asteris-zen');

    // motion
    if (s.animations) {
      on.push('asteris-anim');
      add(s.animHover, 'asteris-anim-hover');
      add(s.animTabs, 'asteris-anim-tabs');
      add(s.animModals, 'asteris-anim-modals');
      add(s.animMicro, 'asteris-anim-micro');
      add(s.animSidebar, 'asteris-anim-sidebar');
    } else {
      on.push('asteris-anim-off');
    }
    add(s.respectReducedMotion, 'asteris-respect-rm');

    on.forEach((c) => body.classList.add(c));

    // custom properties
    const st = body.style;
    st.setProperty('--as-font-size', s.fontSize + 'px');
    st.setProperty('--as-line-height', String(s.lineHeight));
    st.setProperty('--as-line-width', s.lineWidth + 'rem');
    st.setProperty('--as-dur-scale', String(s.animSpeed));

    if (s.accentOverride) {
      const hsl = hexToHsl(s.accentColor);
      if (hsl) {
        st.setProperty('--as-accent-h', String(hsl.h));
        st.setProperty('--as-accent-s', hsl.s + '%');
        st.setProperty('--as-accent-l', hsl.l + '%');
      }
    } else {
      st.removeProperty('--as-accent-h');
      st.removeProperty('--as-accent-s');
      st.removeProperty('--as-accent-l');
    }

    this.syncBaseScheme();
  }
}

/* ------------------------------------------------------------ quick panel */

class AsterisQuickPanel extends obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass('asteris-quick-modal');
    contentEl.empty();
    contentEl.createEl('h3', { text: 'Appearance', cls: 'asteris-qp-title' });

    const grid = contentEl.createDiv({ cls: 'asteris-qp-grid' });
    PRESETS.forEach((p) => {
      const card = grid.createDiv({ cls: 'asteris-qp-card' });
      if (p.id === this.plugin.settings.preset) card.addClass('is-active');
      const sw = card.createDiv({ cls: 'asteris-qp-swatch' });
      sw.style.background =
        'linear-gradient(135deg, ' + p.swatch[0] + ' 0 55%, ' + p.swatch[1] + ' 55% 100%)';
      const dot = sw.createDiv({ cls: 'asteris-qp-dot' });
      dot.style.background = p.swatch[2];
      card.createDiv({ cls: 'asteris-qp-name', text: p.name });
      card.createDiv({ cls: 'asteris-qp-hint', text: p.hint });
      card.addEventListener('click', () => {
        this.plugin.setPreset(p.id);
        grid.findAll('.asteris-qp-card').forEach((c) => c.removeClass('is-active'));
        card.addClass('is-active');
      });
    });

    const row = contentEl.createDiv({ cls: 'asteris-qp-row' });
    const quick = [
      ['Animations', () => this.plugin.settings.animations, (v) => { this.plugin.settings.animations = v; }],
      ['Focus mode', () => this.plugin.settings.focusMode, (v) => { this.plugin.settings.focusMode = v; }],
      ['Zen mode', () => this.plugin.settings.zen, (v) => { this.plugin.settings.zen = v; }],
      ['Hide ribbon', () => this.plugin.settings.hideRibbon, (v) => { this.plugin.settings.hideRibbon = v; }],
    ];
    quick.forEach(([label, get, set]) => {
      const chip = row.createDiv({ cls: 'asteris-qp-chip', text: label });
      if (get()) chip.addClass('is-on');
      chip.addEventListener('click', () => {
        const next = !get();
        set(next);
        chip.toggleClass('is-on', next);
        this.plugin.saveAndApply();
      });
    });

    const footer = contentEl.createDiv({ cls: 'asteris-qp-footer' });
    const more = footer.createEl('button', { text: 'All options', cls: 'mod-cta' });
    more.addEventListener('click', () => {
      this.close();
      try {
        this.app.setting.open();
        this.app.setting.openTabById('asteris-appearance');
      } catch (e) {
        new obsidian.Notice('Settings > Community plugins > Asteris Appearance');
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

/* ----------------------------------------------------------- settings tab */

class AsterisSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  save() {
    return this.plugin.saveAndApply();
  }

  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();

    /* ------------------------------------------------------------ palette */

    new obsidian.Setting(containerEl).setName('Palette').setHeading();

    new obsidian.Setting(containerEl)
      .setName('Colour preset')
      .setDesc('Six dark schemes and two light ones. Void is true black for OLED panels.')
      .addDropdown((d) => {
        PRESETS.forEach((p) => d.addOption(p.id, p.name + (p.dark ? '  (dark)' : '  (light)')));
        d.setValue(s.preset).onChange(async (v) => {
          this.plugin.setPreset(v);
          this.display();
        });
      });

    new obsidian.Setting(containerEl)
      .setName('Match Obsidian light and dark mode to the preset')
      .setDesc('Keeps syntax highlighting and plugin colours in step when you pick a light preset.')
      .addToggle((t) => t.setValue(s.syncBaseScheme).onChange(async (v) => {
        s.syncBaseScheme = v;
        await this.save();
      }));

    new obsidian.Setting(containerEl)
      .setName('Custom accent colour')
      .setDesc('Overrides the accent that ships with the preset.')
      .addToggle((t) => t.setValue(s.accentOverride).onChange(async (v) => {
        s.accentOverride = v;
        await this.save();
        this.display();
      }));

    if (s.accentOverride) {
      new obsidian.Setting(containerEl)
        .setName('Accent')
        .addColorPicker((c) => c.setValue(s.accentColor).onChange(async (v) => {
          s.accentColor = v;
          await this.save();
        }))
        .addExtraButton((b) => b.setIcon('rotate-ccw').setTooltip('Back to the preset accent')
          .onClick(async () => {
            s.accentColor = PRESET_BY_ID[s.preset].swatch[2];
            await this.save();
            this.display();
          }));
    }

    new obsidian.Setting(containerEl)
      .setName('Corner roundness')
      .addDropdown((d) => d
        .addOption('sharp', 'Sharp')
        .addOption('medium', 'Medium')
        .addOption('soft', 'Soft')
        .setValue(s.roundness)
        .onChange(async (v) => { s.roundness = v; await this.save(); }));

    /* --------------------------------------------------------- typography */

    new obsidian.Setting(containerEl).setName('Typography and density').setHeading();

    new obsidian.Setting(containerEl)
      .setName('Editor typeface')
      .setDesc('Falls back to a system face if the first choice is not installed.')
      .addDropdown((d) => d
        .addOption('sans', 'Sans (Inter, Segoe UI)')
        .addOption('serif', 'Serif (Source Serif, Constantia)')
        .addOption('mono', 'Mono (JetBrains Mono, Consolas)')
        .setValue(s.editorFont)
        .onChange(async (v) => { s.editorFont = v; await this.save(); }));

    new obsidian.Setting(containerEl)
      .setName('Heading style')
      .addDropdown((d) => d
        .addOption('modern', 'Modern (tight sans)')
        .addOption('classic', 'Classic (serif headings)')
        .addOption('accentbars', 'Accent bars')
        .setValue(s.headingStyle)
        .onChange(async (v) => { s.headingStyle = v; await this.save(); }));

    new obsidian.Setting(containerEl)
      .setName('Text size')
      .addSlider((sl) => sl.setLimits(13, 24, 1).setValue(s.fontSize).setDynamicTooltip()
        .onChange(async (v) => { s.fontSize = v; await this.save(); }));

    new obsidian.Setting(containerEl)
      .setName('Line height')
      .addSlider((sl) => sl.setLimits(1.2, 2.2, 0.02).setValue(s.lineHeight).setDynamicTooltip()
        .onChange(async (v) => { s.lineHeight = v; await this.save(); }));

    new obsidian.Setting(containerEl)
      .setName('Line width')
      .setDesc('How wide a paragraph is allowed to run, in rem.')
      .addSlider((sl) => sl.setLimits(30, 90, 1).setValue(s.lineWidth).setDynamicTooltip()
        .onChange(async (v) => { s.lineWidth = v; await this.save(); }));

    new obsidian.Setting(containerEl)
      .setName('Interface density')
      .addDropdown((d) => d
        .addOption('compact', 'Compact')
        .addOption('comfortable', 'Comfortable')
        .addOption('spacious', 'Spacious')
        .setValue(s.density)
        .onChange(async (v) => { s.density = v; await this.save(); }));

    /* ----------------------------------------------------------- simplify */

    new obsidian.Setting(containerEl).setName('Simplify the interface').setHeading();

    const toggle = (name, desc, key) => {
      const set = new obsidian.Setting(containerEl).setName(name);
      if (desc) set.setDesc(desc);
      set.addToggle((t) => t.setValue(s[key]).onChange(async (v) => {
        s[key] = v;
        await this.save();
      }));
      return set;
    };

    toggle('Hide the left ribbon', 'The icon strip down the far left.', 'hideRibbon');
    toggle('Reveal the ribbon on hover', 'Only applies while the ribbon is hidden.', 'ribbonHover');
    toggle('Hide the vault name', null, 'hideVaultName');
    toggle('Hide the status bar', null, 'hideStatusBar');
    toggle('Reveal the status bar on hover', 'Only applies while the status bar is hidden.', 'statusBarHover');
    toggle('Hide the tab chip when a pane has one tab', 'The bar itself stays, so the window controls remain.', 'hideSingleTab');
    toggle('Hide the note header bar', 'The strip above the editor holding the file name and view actions.', 'hideViewHeader');
    toggle('Quiet the sidebar buttons', 'Sort and collapse controls fade in when you hover the pane.', 'cleanNav');
    toggle('Scrollbars only on hover', null, 'hideScrollbars');
    toggle('Dim inactive panes', null, 'dimInactivePanes');
    toggle('Focus mode', 'Fades every line except the one under the cursor.', 'focusMode');
    toggle('Remove pane dividers', null, 'noDividers');

    new obsidian.Setting(containerEl)
      .setDesc('Zen mode turns most of the above on at once without changing these switches. It is bound to a command, so you can give it a hotkey.');

    /* ------------------------------------------------------------- motion */

    new obsidian.Setting(containerEl).setName('Animation').setHeading();

    new obsidian.Setting(containerEl)
      .setName('Animations')
      .setDesc('Off also suppresses the transitions built into Obsidian.')
      .addToggle((t) => t.setValue(s.animations).onChange(async (v) => {
        s.animations = v;
        await this.save();
        this.display();
      }));

    if (s.animations) {
      new obsidian.Setting(containerEl)
        .setName('Speed')
        .setDesc('1.0 is the house pace. Lower is snappier, higher is slower.')
        .addSlider((sl) => sl.setLimits(0.4, 2, 0.1).setValue(s.animSpeed).setDynamicTooltip()
          .onChange(async (v) => { s.animSpeed = v; await this.save(); }));

      toggle('Hover motion', 'Sidebar items slide, ribbon icons lift, callouts respond.', 'animHover');
      toggle('Tab and pane transitions', 'Content fades up when you switch note.', 'animTabs');
      toggle('Modal and menu motion', 'Command palette, menus and hover previews scale in.', 'animModals');
      toggle('Micro interactions', 'Button press, checkbox pop, list highlights.', 'animMicro');
      toggle('Sidebar reveal', null, 'animSidebar');
    }

    new obsidian.Setting(containerEl)
      .setName('Respect the system reduced-motion setting')
      .setDesc('Recommended. Turns animation off automatically when the OS asks for it.')
      .addToggle((t) => t.setValue(s.respectReducedMotion).onChange(async (v) => {
        s.respectReducedMotion = v;
        await this.save();
      }));

    /* --------------------------------------------------------------- misc */

    new obsidian.Setting(containerEl).setName('Reset').setHeading();
    new obsidian.Setting(containerEl)
      .setName('Restore defaults')
      .addButton((b) => b.setButtonText('Reset').setWarning().onClick(async () => {
        this.plugin.settings = Object.assign({}, DEFAULTS);
        await this.save();
        this.display();
        new obsidian.Notice('Asteris appearance reset.');
      }));
  }
}

module.exports = AsterisAppearance;
