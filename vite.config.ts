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

// Nuxt UI's built-in icons (its lucide defaults), listed so the icon bundler below picks them up
const uiIcons = {
  arrowDown: 'i-lucide-arrow-down',
  arrowLeft: 'i-lucide-arrow-left',
  arrowRight: 'i-lucide-arrow-right',
  arrowUp: 'i-lucide-arrow-up',
  caution: 'i-lucide-circle-alert',
  check: 'i-lucide-check',
  chevronDoubleLeft: 'i-lucide-chevrons-left',
  chevronDoubleRight: 'i-lucide-chevrons-right',
  chevronDown: 'i-lucide-chevron-down',
  chevronLeft: 'i-lucide-chevron-left',
  chevronRight: 'i-lucide-chevron-right',
  chevronUp: 'i-lucide-chevron-up',
  close: 'i-lucide-x',
  copy: 'i-lucide-copy',
  copyCheck: 'i-lucide-copy-check',
  dark: 'i-lucide-moon',
  drag: 'i-lucide-grip-vertical',
  ellipsis: 'i-lucide-ellipsis',
  error: 'i-lucide-circle-x',
  external: 'i-lucide-arrow-up-right',
  eye: 'i-lucide-eye',
  eyeOff: 'i-lucide-eye-off',
  file: 'i-lucide-file',
  folder: 'i-lucide-folder',
  folderOpen: 'i-lucide-folder-open',
  hash: 'i-lucide-hash',
  info: 'i-lucide-info',
  light: 'i-lucide-sun',
  loading: 'i-lucide-loader-circle',
  menu: 'i-lucide-menu',
  minus: 'i-lucide-minus',
  panelClose: 'i-lucide-panel-left-close',
  panelOpen: 'i-lucide-panel-left-open',
  plus: 'i-lucide-plus',
  reload: 'i-lucide-rotate-ccw',
  search: 'i-lucide-search',
  stop: 'i-lucide-square',
  success: 'i-lucide-circle-check',
  system: 'i-lucide-monitor',
  tip: 'i-lucide-lightbulb',
  upload: 'i-lucide-upload',
  warning: 'i-lucide-triangle-alert',
};

/**
 * Bundles the lucide icons referenced in the source (`i-lucide-name` / `lucide:name`) as
 * `virtual:lucide-icons`, so icons render instantly and without the Iconify web API.
 */
function lucideSubset(): Plugin {
  const virtualId = 'virtual:lucide-icons';
  const resolvedId = `\0${virtualId}`;
  const iconPattern = /(?:i-lucide-|lucide:)([a-z0-9]+(?:-[a-z0-9]+)*)/g;
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
    name: 'lucide-subset',
    resolveId: (id) => (id === virtualId ? resolvedId : undefined),
    load(id) {
      if (id !== resolvedId) return;
      names = scan();
      const lucide = JSON.parse(
        readFileSync(resolve(__dirname, 'node_modules/@iconify-json/lucide/icons.json'), 'utf8'),
      );
      const icons: Record<string, unknown> = {};
      const aliases: Record<string, unknown> = {};
      for (const name of names) {
        const alias = lucide.aliases?.[name];
        if (alias) {
          aliases[name] = alias;
          icons[alias.parent] = lucide.icons[alias.parent];
        } else if (lucide.icons[name]) {
          icons[name] = lucide.icons[name];
        } else {
          this.warn(`Unknown lucide icon: ${name}`);
        }
      }
      const data = { prefix: 'lucide', width: lucide.width, height: lucide.height, icons, aliases };
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
          primary: 'amber',
          neutral: 'zinc',
        },
        // Keep the smallest text at 12px (Nuxt UI's small badges and key hints go down to 8-11px)
        badge: {
          variants: {
            size: {
              xs: { base: 'text-xs/4 px-1 py-0 gap-1 rounded-sm' },
              sm: { base: 'text-xs/4 px-1.5 py-0.5 gap-1 rounded-sm' },
            },
          },
        },
        kbd: {
          variants: {
            size: {
              sm: 'h-4 min-w-4 text-xs',
              md: 'h-5 min-w-5 text-xs',
            },
          },
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
            th: 'px-3 py-2 text-xs font-medium text-muted text-left whitespace-nowrap',
            td: 'px-3 py-2 text-sm text-default text-left tabular-nums',
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
    lucideSubset(),
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
