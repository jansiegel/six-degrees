import type { ReactNode } from 'react';
import clsx from 'clsx';

type Props = {
    children: ReactNode;
    disabled?: boolean;
    type?: 'submit' | 'button';
    onClick?: () => void;
};

const CSS_CLASSES = {
    button: [
        'bg-poster-light-bg',
        'disabled:bg-poster-light-bg/90',
        'w-full',
        'rounded-md',
        'p-5',
        'text-2xl',
        'font-bold',
        'text-center',
        'text-page-bg',
        'uppercase',
        'shadow-[inset_-0.1em_-0.1em_0_0_var(--color-poster-bg-orange)]',
    ],
};

export const Button = ({ children, disabled, type = 'button', onClick }: Props) => (
    <button type={type} disabled={disabled} onClick={onClick} className={clsx(CSS_CLASSES.button)}>
        {children}
    </button>
);
