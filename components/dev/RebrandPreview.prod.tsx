import { Redirect } from 'expo-router';

/** Metro serves this instead of the fixture harness in a production bundle. */
export default function RebrandPreviewProduction() {
    return <Redirect href="/" />;
}
