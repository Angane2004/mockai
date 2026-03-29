import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
    const location = useLocation();

    const pageVariants: Variants = {
        initial: {
            opacity: 0,
            x: -20,
        },
        animate: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
            },
        },
        exit: {
            opacity: 0,
            x: 20,
            transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
            },
        },
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                className="w-full h-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};
