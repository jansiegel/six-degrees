import type { ReactNode } from 'react';
import clsx from 'clsx';

type Props = { children?: ReactNode };

const POSTER_CLASSES = [
    'flex',
    'flex-col',
    'flex-none',
    'justify-center',
    'items-center',
    'bg-poster-bg-orange',
    'p-8',
    'w-full',
    'md:min-h-1/2',
    'font-(family-name:--font-young-serif,serif)',
];

export const Poster = ({ children }: Props) => {
    return (
        <div className={clsx(POSTER_CLASSES)}>
            {children}
        </div>
    );
};
