import clsx from 'clsx';
import styles from './InteractiveLabel.module.css';

type Props = {
    injectedName?: string;
};

const PLACEHOLDER_LAYER_CLASSES = [
    'row-start-1',
    'col-start-1',
    'transition-opacity',
    'duration-500',
];

const PLACEHOLDER_HINT_CLASSES = [
    ...PLACEHOLDER_LAYER_CLASSES,
    'tracking-tighter',
];

const TITLE_CLASSES = [
    'text-center',
    'text-5xl',
    'mb-2',
    'text-poster-font',
];

const Placeholder = ({ value }: { value?: string }) => {
    const hasValue = !!value;

    return (
        <span className="inline-grid">
            <span aria-hidden className={clsx(PLACEHOLDER_HINT_CLASSES, hasValue ? 'opacity-0' : 'opacity-100')}>
                __________
            </span>
            <span className={clsx(PLACEHOLDER_LAYER_CLASSES, hasValue ? 'opacity-100' : 'opacity-0')}>
                {value || ' '}
            </span>
        </span>
    );
};

export const InteractiveLabel = ({ injectedName }: Props) => {
    return (
        <div className="flex flex-col">
            <h1 className={clsx(styles.title, TITLE_CLASSES)}>THE <br />SIX <br />DEGREES<br /> OF<br /></h1>
            <h1 className={clsx(styles.title, TITLE_CLASSES)}>
                <Placeholder value={injectedName} />
            </h1>
        </div>
    );
};
