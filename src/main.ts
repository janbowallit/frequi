import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import ui from '@nuxt/ui/vue-plugin';
import { addCollection } from '@iconify/vue';
import mdiIcons from 'virtual:mdi-icons';

import App from './App.vue';
import router from './router';
import { i18n } from './i18n';
import './styles/tailwind.css';

// Icons are bundled with the app instead of loaded from the Iconify API
addCollection(mdiIcons);

const myApp = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
myApp.use(pinia);

myApp.use(ui);

myApp.use(i18n);

myApp.use(router);

// Vue.config.productionTip = false;
myApp.mount('#app');
