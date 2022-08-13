import { createRoot } from 'react-dom/client';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

import './index.scss';
import App from './App';

library.add(fas);

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
