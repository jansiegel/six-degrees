import clsx from 'clsx';
import { MainPanel } from '@/components/MainPanel/MainPanel';
import { Footer } from '@/components/Footer/Footer';

const MAIN_CLASSES = [
    'flex',
    'flex-col',
    'items-center',
    'p-7',
];

export default function Home() {
    return (
        <>
            <main className={clsx(MAIN_CLASSES)}>
                <MainPanel />
            </main>
            <Footer />
        </>
    );
}
