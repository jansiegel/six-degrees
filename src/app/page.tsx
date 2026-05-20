import clsx from 'clsx';
import { MainPanel } from '@/components/MainPanel/MainPanel';
import { Footer } from '@/components/Footer/Footer';

const CSS_CLASSES = {
    main: [
        'flex',
        'flex-col',
        'items-center',
        'p-7',
    ],
};

export default function Home() {
    return (
        <>
            <main className={clsx(CSS_CLASSES.main)}>
                <MainPanel />
            </main>
            <Footer />
        </>
    );
}
