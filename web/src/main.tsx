import { createRoot } from 'react-dom/client';
import App from './App';
import 'font-awesome/css/font-awesome.min.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './styles/studio.css';
import i18n from './i18n';

async function init() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();
    if (data.language) {
      await i18n.changeLanguage(data.language);
    }
  } catch (e) {
    console.error('Failed to load language config', e);
  }

  createRoot(document.getElementById('root')!).render(<App />);
}

init();
