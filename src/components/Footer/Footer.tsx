import clsx from 'clsx';
import styles from './Footer.module.css';

const CSS_CLASSES = {
    footer: [
        'border-t-2',
        'ml-7',
        'mr-7',
        'border-footer',
        'text-footer',
        'text-center',
    ],
    list: [
        'list-none',
        'm-3',
        'text-sm',
    ],
};

export const Footer = () => {
    return (
        <footer className={clsx(styles.footer, CSS_CLASSES.footer)}>
            <ul className={clsx(CSS_CLASSES.list)}>
                <li>
                    Created by{' '}
                    <a href="https://jansiegel.com" target="_blank">
                        Jan Siegel
                    </a>
                    , based on the idea of{' '}
                    <a
                        href="https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        the Six Degrees of Kevin Bacon
                    </a>
                    .
                </li>
                <li>
                    Data sourced from the{' '}
                    <a
                        href="https://musicbrainz.org/doc/MusicBrainz_Database/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        MusicBrainz
                    </a>{' '}
                    database.
                </li>
            </ul>
        </footer>
    );
};
