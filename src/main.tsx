import { render } from 'preact';
import 'xp.css/dist/XP.css';
import './styles.css';
import { restoreAndAutosave } from './model/store';
import { App } from './ui/App';

render(<App />, document.getElementById('app')!);

void restoreAndAutosave();
