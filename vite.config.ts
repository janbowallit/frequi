import { defineConfig } from 'vitest/config';

import createVuePlugin from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';
import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import type { Plugin } from 'vite';
import IconsResolve from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';

let commitHash: string = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString();
} catch (error) {
  console.error('Failed to get commit hash. Running in this mode will not be supported.');
}

// Nuxt UI's built-in icons (close, chevrons, loading, ...), mapped from lucide to mdi so that
// a single locally bundled icon set covers the whole UI.
const uiIcons = {
  arrowDown: 'i-mdi-arrow-down',
  arrowLeft: 'i-mdi-arrow-left',
  arrowRight: 'i-mdi-arrow-right',
  arrowUp: 'i-mdi-arrow-up',
  caution: 'i-mdi-alert-circle-outline',
  check: 'i-mdi-check',
  chevronDoubleLeft: 'i-mdi-chevron-double-left',
  chevronDoubleRight: 'i-mdi-chevron-double-right',
  chevronDown: 'i-mdi-chevron-down',
  chevronLeft: 'i-mdi-chevron-left',
  chevronRight: 'i-mdi-chevron-right',
  chevronUp: 'i-mdi-chevron-up',
  close: 'i-mdi-close',
  copy: 'i-mdi-content-copy',
  copyCheck: 'i-mdi-check',
  dark: 'i-mdi-weather-night',
  drag: 'i-mdi-drag-vertical',
  ellipsis: 'i-mdi-dots-horizontal',
  error: 'i-mdi-close-circle-outline',
  external: 'i-mdi-arrow-top-right',
  eye: 'i-mdi-eye-outline',
  eyeOff: 'i-mdi-eye-off-outline',
  file: 'i-mdi-file-outline',
  folder: 'i-mdi-folder-outline',
  folderOpen: 'i-mdi-folder-open-outline',
  hash: 'i-mdi-pound',
  info: 'i-mdi-information-outline',
  light: 'i-mdi-white-balance-sunny',
  loading: 'i-mdi-loading',
  menu: 'i-mdi-menu',
  minus: 'i-mdi-minus',
  panelClose: 'i-mdi-dock-left',
  panelOpen: 'i-mdi-dock-left',
  plus: 'i-mdi-plus',
  reload: 'i-mdi-refresh',
  search: 'i-mdi-magnify',
  stop: 'i-mdi-stop',
  success: 'i-mdi-check-circle-outline',
  system: 'i-mdi-monitor',
  tip: 'i-mdi-lightbulb-outline',
  upload: 'i-mdi-upload',
  warning: 'i-mdi-alert-outline',
};

/**
 * Bundles the mdi icons referenced in the source (`i-mdi-name` / `mdi:name`) as
 * `virtual:mdi-icons`, so icons render instantly and without the Iconify web API.
 */
function mdiSubset(): Plugin {
  const virtualId = 'virtual:mdi-icons';
  const resolvedId = `\0${virtualId}`;
  const iconPattern = /(?:i-mdi-|mdi:)([a-z0-9]+(?:-[a-z0-9]+)*)/g;
  const srcDir = resolve(__dirname, 'src');
  let names = new Set<string>();

  function namesIn(text: string): string[] {
    return [...text.matchAll(iconPattern)].map((m) => m[1]!);
  }

  function scan(): Set<string> {
    const found = new Set(Object.values(uiIcons).flatMap(namesIn));
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.(vue|ts)$/.test(entry.name)) {
          namesIn(readFileSync(path, 'utf8')).forEach((n) => found.add(n));
        }
      }
    };
    walk(srcDir);
    return found;
  }

  return {
    name: 'mdi-subset',
    resolveId: (id) => (id === virtualId ? resolvedId : undefined),
    load(id) {
      if (id !== resolvedId) return;
      names = scan();
      const mdi = JSON.parse(
        readFileSync(resolve(__dirname, 'node_modules/@iconify-json/mdi/icons.json'), 'utf8'),
      );
      const icons: Record<string, unknown> = {};
      const aliases: Record<string, unknown> = {};
      for (const name of names) {
        const alias = mdi.aliases?.[name];
        if (alias) {
          aliases[name] = alias;
          icons[alias.parent] = mdi.icons[alias.parent];
        } else if (mdi.icons[name]) {
          icons[name] = mdi.icons[name];
        } else {
          this.warn(`Unknown mdi icon: ${name}`);
        }
      }
      const data = { prefix: 'mdi', width: mdi.width, height: mdi.height, icons, aliases };
      return `export default ${JSON.stringify(data)};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(srcDir)) return;
      const added = namesIn(readFileSync(file, 'utf8')).some((n) => !names.has(n));
      const mod = added && server.moduleGraph.getModuleById(resolvedId);
      if (mod) {
        server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [
    createVuePlugin({
      script: {
        defineModel: true,
      },
    }),
    ui({
      ui: {
        icons: uiIcons,
        colors: {
          primary: 'brass',
          // Custom scale from tailwind.css - works at runtime, but the type only lists Tailwind's grays
          neutral: 'graphite' as 'slate',
        },
        alert: {
          defaultVariants: {
            variant: 'subtle',
          },
        },
        button: {
          defaultVariants: {
            variant: 'subtle',
          },
        },
        table: {
          slots: {
            thead: 'bg-muted',
            th: 'px-3 py-2 text-[13px] font-medium text-muted text-left whitespace-nowrap',
            td: 'px-3 py-2 text-default text-md text-left tabular-nums',
            tr: 'hover:bg-elevated/50',
            empty: 'py-2 text-center text-muted',
          },
        },
        tabs: {
          variants: {
            variant: {
              link: {
                list: 'overflow-x-auto',
                trigger:
                  'grow whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm',
              },
            },
          },
        },
        tooltip: {
          slots: {
            content: 'max-w-xs whitespace-normal',
          },
        },
      },
      autoImport: {
        imports: ['vue', 'vue-router', '@vueuse/core', 'pinia'],
        dts: 'src/auto-imports.d.ts',
        dirs: ['src/composables', 'src/stores', 'src/utils/**'],
        vueTemplate: true,
      },
      components: {
        resolvers: [IconsResolve()],
        dts: 'src/components.d.ts',
      },
    }),
    Icons({
      compiler: 'vue3',
    }),
    mdiSubset(),
  ],
  resolve: {
    dedupe: ['vue'],
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700, // Default is 500
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.FT_API_URL ?? 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true,
      },
    },
    host: '127.0.0.1',
    port: 3000,
  },
  test: {
    environment: 'happy-dom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
  },
});
