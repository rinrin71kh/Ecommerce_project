import './assets/main.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia)
app.use(router); 
app.use(PrimeVue);
app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});

app.mount('#app');
