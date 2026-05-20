import clsx from 'clsx';
import styles from './InteractiveLabel.module.css';

type Props = {
    injectedName?: string;
};

const CSS_CLASSES = {
    placeholderLayer: [
        'row-start-1',
        'col-start-1',
        'transition-opacity',
        'duration-500',
    ],
    placeholderHint: [
        'row-start-1',
        'col-start-1',
        'transition-opacity',
        'duration-500',
        'tracking-tighter',
    ],
    title: [
        'text-center',
        'text-5xl',
        'mb-2',
        'text-poster-font',
    ],
};

const Placeholder = ({ value }: { value?: string }) => {
    const hasValue = !!value;

    return (
        <span className="inline-grid">
            <span aria-hidden className={clsx(CSS_CLASSES.placeholderHint, hasValue ? 'opacity-0' : 'opacity-100')}>
                __________
            </span>
            <span className={clsx(CSS_CLASSES.placeholderLayer, hasValue ? 'opacity-100' : 'opacity-0')}>
                {value || ' '}
            </span>
        </span>
    );
};

export const InteractiveLabel = ({ injectedName }: Props) => {
    return (
        <div className="flex flex-col">
            <h1 className={clsx(styles.title, CSS_CLASSES.title)}>
                THE <br />
                SIX <br />
                DEGREES
                <br /> OF
                <br />
            </h1>
            <h1 className={clsx(styles.title, CSS_CLASSES.title)}>
                <Placeholder value={injectedName} />
            </h1>
        </div>
    );
};
