import type { MessageSchema } from './index';

// Message keys for `$t` in templates (editor completion)
declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends MessageSchema {}
}
