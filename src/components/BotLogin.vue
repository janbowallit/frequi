<script setup lang="ts">
import type { AuthPayload, AuthStorageWithBotId } from '@/types';

import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const props = withDefaults(
  defineProps<{
    inModal?: boolean;
    existingAuth?: AuthStorageWithBotId;
  }>(),
  {
    inModal: false,
    existingAuth: undefined,
  },
);
const emit = defineEmits<{ loginResult: [value: boolean] }>();

type Field = 'username' | 'password' | 'url';
interface FormError {
  kind: 'credentials' | 'connection';
  title: string;
  description: string;
}

const defaultURL = window.location.origin || 'http://localhost:3000';

const router = useRouter();
const route = useRoute();
const botStore = useBotStore();

const auth = ref<AuthPayload>({
  botName: '',
  url: defaultURL,
  username: '',
  password: '',
});
const fieldErrors = ref<Partial<Record<Field, string | boolean>>>({});
const formError = ref<FormError>();
const formErrorRef = ref<HTMLElement>();
const submitting = ref(false);
const showPassword = ref(false);
const capsLockOn = ref(false);
const botEdit = ref(false);
// Connection settings are only needed for remote bots - keep them out of the way otherwise.
const connectionOpen = ref(false);

const fieldInputIds: Record<Field, string> = {
  username: 'username-input',
  password: 'password-input',
  url: 'url-input',
};

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

const urlDuplicate = computed<boolean>(() => {
  const bots = Object.values(botStore.availableBots).find(
    (bot) => bot.botUrl === normalizeUrl(auth.value.url),
  );
  return !botEdit.value && bots !== undefined;
});

const connectionSummary = computed(() => {
  try {
    return new URL(normalizeUrl(auth.value.url)).host;
  } catch {
    return auth.value.url;
  }
});

const isRemoteUrl = computed(() => normalizeUrl(auth.value.url) !== window.location.origin);

const submitLabel = computed(() => {
  if (submitting.value) return 'Signing in…';
  return botEdit.value ? 'Save and sign in' : 'Sign in';
});

function emitLoginResult(value: boolean) {
  emit('loginResult', value);
}

function focusField(field: Field) {
  nextTick(() => document.getElementById(fieldInputIds[field])?.focus());
}

function validate(): Field | undefined {
  const errors: Partial<Record<Field, string>> = {};
  if (!auth.value.username.trim()) {
    errors.username = 'Enter your username.';
  }
  if (!auth.value.password) {
    errors.password = 'Enter your password.';
  }
  const url = normalizeUrl(auth.value.url);
  if (!url) {
    errors.url = 'Enter the bot URL.';
  } else if (!/^https?:\/\/[^\s/]+/i.test(url)) {
    errors.url = 'Use a full URL, for example http://127.0.0.1:8080';
  }
  fieldErrors.value = errors;
  const order: Field[] = ['username', 'password', 'url'];
  return order.find((field) => errors[field]);
}

// Editing a field clears its error - stale errors are confusing.
watch(
  () => auth.value.username,
  () => {
    delete fieldErrors.value.username;
    if (formError.value?.kind === 'credentials') formError.value = undefined;
  },
);
watch(
  () => auth.value.password,
  () => {
    delete fieldErrors.value.password;
    if (formError.value?.kind === 'credentials') formError.value = undefined;
  },
);
watch(
  () => auth.value.url,
  () => {
    delete fieldErrors.value.url;
    if (formError.value?.kind === 'connection') formError.value = undefined;
  },
);

function updateCapsLock(event: KeyboardEvent) {
  capsLockOn.value = event.getModifierState?.('CapsLock') ?? false;
}

function showFormError(error: FormError) {
  formError.value = error;
  // Move focus to the alert so screen reader users hear what went wrong.
  nextTick(() => formErrorRef.value?.focus());
}

async function handleSubmit() {
  // Ignore repeated submits (double click, Enter while the request is running)
  if (submitting.value) {
    return;
  }
  formError.value = undefined;
  const firstInvalid = validate();
  if (firstInvalid) {
    if (firstInvalid === 'url') connectionOpen.value = true;
    focusField(firstInvalid);
    return;
  }
  auth.value.url = normalizeUrl(auth.value.url);
  auth.value.username = auth.value.username.trim();

  submitting.value = true;
  try {
    const botId =
      botEdit.value && props.existingAuth ? props.existingAuth.botId : botStore.nextBotId;
    const { login } = useLoginInfo(botId);
    await login(auth.value);
    if (botEdit.value) {
      const thisBot = botStore.botStores[botId];
      if (thisBot) {
        thisBot.isBotLoggedIn = true;
        thisBot.isBotOnline = true;
      }
      emitLoginResult(true);
    } else {
      const sortId = Object.keys(botStore.availableBots).length + 1;
      botStore.addBot({
        botName: auth.value.botName.trim(),
        botId,
        botUrl: auth.value.url,
        sortId: sortId,
      });
      botStore.selectBot(botId);
      emitLoginResult(true);
      botStore.allRefreshFull();
    }

    if (props.inModal === false) {
      if (typeof route?.query.redirect === 'string') {
        const resolved = router.resolve({ path: route.query.redirect });
        router.push(resolved.name === '404' ? '/' : resolved.path);
      } else {
        router.push('/');
      }
    }
  } catch (error) {
    console.error(error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      fieldErrors.value = { username: true, password: true };
      showFormError({
        kind: 'credentials',
        title: 'Wrong username or password',
        description:
          'The bot rejected these credentials. They are set under "api_server" in your bot configuration.',
      });
    } else {
      fieldErrors.value = { url: true };
      connectionOpen.value = true;
      showFormError({
        kind: 'connection',
        title: "Can't reach the bot",
        description: `No response from ${auth.value.url}. Make sure the bot is running and its API server is enabled.`,
      });
    }
    emitLoginResult(false);
  } finally {
    submitting.value = false;
  }
}

function resetLogin() {
  auth.value = {
    botName: '',
    url: defaultURL,
    username: '',
    password: '',
  };
  fieldErrors.value = {};
  formError.value = undefined;
  showPassword.value = false;
  botEdit.value = false;
  // Adding a further bot from the modal almost always means a different URL.
  connectionOpen.value = props.inModal;
}

function reset() {
  resetLogin();
  if (props.existingAuth) {
    botEdit.value = true;
    auth.value.botName = props.existingAuth.botName;
    auth.value.url = props.existingAuth.apiUrl;
    auth.value.username = props.existingAuth.username ?? '';
    connectionOpen.value = false;
  }
  focusField(auth.value.username ? 'password' : 'username');
}

defineExpose({
  reset,
});

onMounted(() => {
  reset();
});
</script>

<template>
  <form
    class="flex flex-col gap-5 text-left"
    novalidate
    :aria-busy="submitting"
    @submit.prevent="handleSubmit"
  >
    <div
      v-if="formError"
      ref="formErrorRef"
      tabindex="-1"
      role="alert"
      class="rounded-lg focus:outline-none"
    >
      <UAlert
        color="error"
        variant="subtle"
        icon="mdi:alert-circle-outline"
        :title="formError.title"
      >
        <template #description>
          <p>{{ formError.description }}</p>
          <p v-if="formError.kind === 'connection'" class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a
              :href="`${auth.url}/api/v1/ping`"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium underline underline-offset-2"
            >
              Test the connection
            </a>
            <a
              v-if="isRemoteUrl"
              href="https://www.freqtrade.io/en/stable/rest-api/#cors"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium underline underline-offset-2"
            >
              Check the CORS setup
            </a>
          </p>
        </template>
      </UAlert>
    </div>

    <UFormField label="Username" name="username" :error="fieldErrors.username">
      <UInput
        id="username-input"
        v-model="auth.username"
        name="username"
        autocomplete="username"
        autocapitalize="none"
        :spellcheck="false"
        icon="mdi:account-outline"
        size="xl"
        class="w-full"
        :ui="{ base: 'h-[44px]' }"
      />
    </UFormField>

    <UFormField
      label="Password"
      name="password"
      :error="fieldErrors.password"
      :help="capsLockOn ? 'Caps Lock is on' : undefined"
    >
      <UInput
        id="password-input"
        v-model="auth.password"
        name="password"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="current-password"
        icon="mdi:lock-outline"
        size="xl"
        class="w-full"
        :ui="{ base: 'h-[44px]', trailing: 'pe-0.5' }"
        @keydown="updateCapsLock"
        @keyup="updateCapsLock"
        @blur="capsLockOn = false"
      >
        <template #trailing>
          <UButton
            type="button"
            color="neutral"
            variant="link"
            size="md"
            class="size-[40px] justify-center"
            :icon="showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showPassword"
            aria-controls="password-input"
            @click="showPassword = !showPassword"
          />
        </template>
      </UInput>
    </UFormField>

    <UCollapsible v-model:open="connectionOpen" class="-mt-1">
      <UButton
        type="button"
        color="neutral"
        variant="link"
        size="md"
        class="group -ms-2.5 px-2.5"
        trailing-icon="mdi:chevron-down"
        :ui="{
          trailingIcon:
            'group-data-[state=open]:rotate-180 transition-transform duration-200 motion-reduce:transition-none',
        }"
      >
        <span>Connection</span>
        <span v-if="!connectionOpen" class="font-normal text-dimmed"
          >· {{ connectionSummary }}</span
        >
      </UButton>
      <template #content>
        <div class="flex flex-col gap-5 pt-3">
          <UFormField
            label="Bot URL"
            name="url"
            :error="fieldErrors.url"
            help="Address of the bot's API server. Defaults to this page's address."
          >
            <UInput
              id="url-input"
              v-model="auth.url"
              name="url"
              type="url"
              inputmode="url"
              autocomplete="url"
              autocapitalize="none"
              :spellcheck="false"
              icon="mdi:link-variant"
              size="xl"
              class="w-full"
              :ui="{ base: 'h-[44px]' }"
            />
          </UFormField>
          <UAlert
            v-if="urlDuplicate"
            color="warning"
            variant="subtle"
            icon="mdi:alert-outline"
            title="You're already connected to a bot at this URL."
          />
          <UFormField
            label="Display name"
            name="botName"
            hint="Optional"
            help="Helps you tell bots apart when you manage several."
          >
            <UInput
              id="name-input"
              v-model="auth.botName"
              name="botName"
              placeholder="e.g. Bitpin bot"
              autocomplete="off"
              icon="mdi:robot-outline"
              size="xl"
              class="w-full"
              :ui="{ base: 'h-[44px]' }"
            />
          </UFormField>
        </div>
      </template>
    </UCollapsible>

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <UButton
        v-if="inModal"
        type="button"
        label="Cancel"
        color="neutral"
        variant="outline"
        size="xl"
        class="h-[44px] justify-center"
        @click="emitLoginResult(true)"
      />
      <UButton
        type="submit"
        :label="submitLabel"
        variant="solid"
        size="xl"
        :loading="submitting"
        :block="!inModal"
        trailing-icon="mdi:arrow-right"
        :ui="{ trailingIcon: 'ms-0' }"
        class="h-[44px] justify-center font-semibold text-white bg-brand-600 hover:bg-brand-700 dark:bg-brand-400 dark:hover:bg-brand-300 dark:text-brand-950 transition-colors duration-200 motion-reduce:transition-none"
      />
    </div>
  </form>
</template>
