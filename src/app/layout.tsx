import type { Metadata } from 'next';
import { DM_Sans, Young_Serif } from 'next/font/google';
import clsx from 'clsx';
import '../styles/globals.css';
import { Providers } from './providers';

const CSS_CLASSES = {
    html: [
        'h-full',
        'antialiased',
        'bg-page-bg',
    ],
    body: [
        'min-h-full',
        'flex',
        'flex-col',
    ],
};

const youngSerif = Young_Serif({
    subsets: ['latin'],
    variable: '--font-young-serif',
    weight: ['400'],
});

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
});

export const metadata: Metadata = {
    title: 'Six Degrees Of... (Music Connections)',
    description:
        'Six Degrees of Kevin Bacon in a music setting. Find the shortest connection between any two artists via their collaborators.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={clsx(youngSerif.variable, dmSans.variable, CSS_CLASSES.html)}>
            <body className={clsx(CSS_CLASSES.body)}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
