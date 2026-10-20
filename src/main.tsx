import { render } from 'preact';
import 'xp.css/dist/XP.css';
import './styles.css';
import { App } from './ui/App';

render(<App />, document.getElementById('app')!);
