import clsx from 'clsx';
import styles from './Footer.module.css';

const FOOTER_CLASSES = [
    'border-t-2',
    'ml-7',
    'mr-7',
    'border-footer',
    'text-footer',
    'text-center',
];

const LIST_CLASSES = [
    'list-none',
    'm-3',
    'text-sm',
];

export const Footer = () => {
    return (
        <footer className={clsx(styles.footer, FOOTER_CLASSES)}>
            <ul className={clsx(LIST_CLASSES)}>
                <li>Created by <a href="https://jansiegel.com" target="_blank">Jan Siegel</a>.</li>
                <li>Data sourced from the <a href="https://musicbrainz.org/doc/MusicBrainz_Database/" target="_blank" rel="noopener noreferrer">MusicBrainz</a> database.</li>
            </ul>
        </footer>
    );
};
