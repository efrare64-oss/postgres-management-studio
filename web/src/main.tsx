import { createRoot } from 'react-dom/client';
import App from './App';
import 'font-awesome/css/font-awesome.min.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './styles/studio.css';

createRoot(document.getElementById('root')!).render(<App />);
