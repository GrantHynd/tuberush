import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Tracks AccessibilityInfo.isReduceMotionEnabled (crossfades only when true). */
export function useReduceMotion(): boolean {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        let mounted = true;
        AccessibilityInfo.isReduceMotionEnabled?.()
            .then((v) => mounted && setReduce(!!v))
            .catch(() => {});
        const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setReduce(!!v));
        return () => {
            mounted = false;
            sub?.remove?.();
        };
    }, []);
    return reduce;
}
