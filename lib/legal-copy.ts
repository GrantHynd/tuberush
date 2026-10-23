export type InlinePart =
    | string
    | { text: string; route: '/privacy' | '/terms' }
    | { text: string; email: string };

export type LegalBlock =
    | { type: 'h2'; text: string }
    | { type: 'p'; content: InlinePart[] }
    | { type: 'ul'; items: string[] };

export type LegalDocument = {
    title: string;
    updated: string;
    intro: InlinePart[];
    blocks: LegalBlock[];
};

const email = { text: 'grant.hynd@gmail.com', email: 'grant.hynd@gmail.com' };

export const privacyPolicy: LegalDocument = {
    title: 'Privacy Policy',
    updated: 'Last updated 23 October 2026',
    intro: [
        'TubeRush is a daily word-game app. This policy explains what the app collects, who processes it, and how you can delete it. It covers your account, gameplay, subscriptions, and the services the app uses: Supabase, PostHog, Sentry, and the Apple and Google in-app purchase systems.',
    ],
    blocks: [
        { type: 'h2', text: 'Who we are' },
        {
            type: 'p',
            content: ['TubeRush is operated by Grant Hynd. For privacy questions or requests, email ', email, '.'],
        },
        { type: 'h2', text: 'Information we collect' },
        {
            type: 'p',
            content: [
                'Account. When you create an account we collect your email address, a username, and a password. Supabase stores the password as a hash. We do not see or store the raw password.',
            ],
        },
        {
            type: 'p',
            content: [
                'Profile. You can optionally set a UK city or town. If you choose London, you can also set a borough. We use this for leaderboards.',
            ],
        },
        {
            type: 'p',
            content: [
                'Gameplay. We store puzzle progress, scores, and custom puzzles you create. A copy is kept on your device so you can play offline, and it syncs to your account when you are signed in and online.',
            ],
        },
        {
            type: 'p',
            content: [
                'In-app purchases. TubeRush Pro is an auto-renewable subscription sold through Apple or Google. The store processes the payment. We do not receive your card number, billing address, or full payment details. RevenueCat receives your TubeRush account id and your subscription status, including whether it is active and which plan you bought, so the app can unlock premium features.',
            ],
        },
        {
            type: 'p',
            content: [
                'Product analytics. We use PostHog, with data sent to its EU host (eu.i.posthog.com), to understand how the app is used. We record events such as opening the app, signing in or out, playing a game, and opening the subscription screen. After you sign in, those events are tied to your account id and email. If you update your city or borough, that location is included on that event. Session replay is off. The app keeps analytics in memory on the device rather than in a local analytics database.',
            ],
        },
        {
            type: 'p',
            content: [
                'Crash reports. Release builds send crash and error reports to Sentry. A report can include a stack trace, device and operating system details, and, when you are signed in, your account id, email, and username. Crash reporting is disabled in development builds. We do not send payment details to Sentry.',
            ],
        },
        {
            type: 'p',
            content: [
                'We do not sell your personal information, and the app does not show third-party advertising.',
            ],
        },
        { type: 'h2', text: 'Leaderboards' },
        {
            type: 'p',
            content: [
                'Other signed-in players can see your username, city or borough, and score. Your email address is not shown on the leaderboard.',
            ],
        },
        { type: 'h2', text: 'How we use information' },
        {
            type: 'p',
            content: [
                'We use this information to create and secure your account, save games, show leaderboards, unlock TubeRush Pro, understand which features people use, and fix crashes.',
            ],
        },
        { type: 'h2', text: 'Service providers' },
        {
            type: 'ul',
            items: [
                'Supabase stores accounts, profiles, game progress, scores, and custom puzzles, and handles sign-in.',
                'PostHog (EU) processes product analytics.',
                'Sentry processes crash and error reports.',
                'RevenueCat processes subscription status for in-app purchases.',
                'Apple and Google process in-app purchase payments and keep the receipt in your store account.',
            ],
        },
        {
            type: 'p',
            content: [
                'They process this information so we can run TubeRush. PostHog is configured for the EU. Supabase, Sentry, RevenueCat, Apple, and Google may process information in the UK, the EEA, or the United States under their own terms.',
            ],
        },
        { type: 'h2', text: 'How long we keep it' },
        {
            type: 'p',
            content: [
                'We keep account and gameplay data until you delete your account. PostHog and Sentry keep analytics and crash reports under their own retention settings. Apple, Google, and RevenueCat keep purchase records so the subscription can be provided.',
            ],
        },
        { type: 'h2', text: 'Deleting your account' },
        {
            type: 'p',
            content: [
                'In the app, open Settings and choose Delete Account. That permanently deletes your profile, scores, saved games, custom puzzles, and login from our database, and clears the copy stored on that device.',
            ],
        },
        {
            type: 'p',
            content: [
                'Deleting your account does not cancel an Apple or Google Play subscription. Cancel that in your store account settings, or it keeps renewing.',
            ],
        },
        {
            type: 'p',
            content: [
                'Events already sent to PostHog, and crash reports already sent to Sentry, are not erased automatically. Email ',
                email,
                ' and we will pass a deletion request to those providers where they allow it.',
            ],
        },
        { type: 'h2', text: 'Your rights' },
        {
            type: 'p',
            content: [
                'If you are in the UK or the EEA you can ask for a copy of your information, ask us to correct it, and ask us to delete it. You can also complain to the Information Commissioner’s Office at ico.org.uk. Email ',
                email,
                ' to make a request.',
            ],
        },
        { type: 'h2', text: 'Children' },
        {
            type: 'p',
            content: [
                'TubeRush is not directed at children under 16. We do not knowingly collect information from children under 16. If you believe a child has given us personal information, email us and we will delete it.',
            ],
        },
        { type: 'h2', text: 'Changes' },
        {
            type: 'p',
            content: [
                'If we change this policy we will update the date at the top and publish the new version at this page.',
            ],
        },
        { type: 'h2', text: 'Contact' },
        {
            type: 'p',
            content: ['Grant Hynd. Email: ', email, '.'],
        },
    ],
};

export const termsOfUse: LegalDocument = {
    title: 'Terms of Use',
    updated: 'Last updated 23 October 2026',
    intro: [
        'These terms are the end user licence agreement (EULA) for the TubeRush app. By creating an account or buying a subscription, you agree to them. Apple’s or Google’s terms also apply to the download and to payments made through that store.',
    ],
    blocks: [
        { type: 'h2', text: 'The service' },
        {
            type: 'p',
            content: [
                'TubeRush is a word-game app. Some games are free. Crossword puzzles and other premium features require TubeRush Pro, which the app shows as 1st Class membership.',
            ],
        },
        { type: 'h2', text: 'Accounts' },
        {
            type: 'p',
            content: [
                'You need an account to save progress and appear on leaderboards. You are responsible for activity on your account. Use an email address you can open, so you can reset your password.',
            ],
        },
        { type: 'h2', text: 'Acceptable use' },
        {
            type: 'p',
            content: [
                'Do not misuse the app, try to access another player’s account, or interfere with the service. We may suspend an account that does this.',
            ],
        },
        { type: 'h2', text: 'Subscriptions and in-app purchases' },
        {
            type: 'p',
            content: [
                'TubeRush Pro is an auto-renewable subscription, sold as an in-app purchase on a monthly plan and a yearly plan.',
            ],
        },
        {
            type: 'ul',
            items: [
                'The subscription title is TubeRush Pro.',
                'The length is one month or one year, as shown on the purchase screen before you confirm.',
                'The price is shown in your local currency on the purchase screen before you confirm. Payment is charged to your Apple ID or Google Play account.',
                'The subscription renews unless you cancel at least 24 hours before the end of the current period.',
                'Your store account is charged for renewal within 24 hours before the current period ends.',
                'Manage or cancel the subscription in your App Store or Google Play account settings. Deleting your TubeRush account does not cancel it.',
            ],
        },
        {
            type: 'p',
            content: [
                'We do not store your card number. Apple or Google processes the payment. RevenueCat receives your account id and subscription status so the app can tell whether TubeRush Pro is active. The ',
                { text: 'Privacy Policy', route: '/privacy' },
                ' describes the account, gameplay, analytics, crash, and purchase data those services handle, including Supabase, PostHog, and Sentry.',
            ],
        },
        { type: 'h2', text: 'Cancellation and refunds' },
        {
            type: 'p',
            content: [
                'Cancel in your store account settings. Refunds are handled by Apple or Google under their policies. TubeRush cannot refund a store purchase from inside the app.',
            ],
        },
        { type: 'h2', text: 'Your content' },
        {
            type: 'p',
            content: [
                'Custom puzzles you create stay yours. You let us store them so the app can show them to you. Daily puzzles, the app, and its design belong to TubeRush. Do not copy them to build a competing service.',
            ],
        },
        { type: 'h2', text: 'Leaderboards' },
        {
            type: 'p',
            content: [
                'Your username, city or borough, and score may be shown to other players. Choose a username you are happy for other players to see.',
            ],
        },
        { type: 'h2', text: 'The service as available' },
        {
            type: 'p',
            content: [
                'Puzzles are for entertainment. We do not promise that TubeRush will always be available or free of errors.',
            ],
        },
        { type: 'h2', text: 'Liability' },
        {
            type: 'p',
            content: [
                'Nothing in these terms limits liability that cannot legally be limited, including liability for death or personal injury caused by negligence, or for fraud. Subject to that, we are not liable for loss of scores, data, or profits, or for indirect loss arising from your use of the app.',
            ],
        },
        { type: 'h2', text: 'Ending these terms' },
        {
            type: 'p',
            content: [
                'You can stop using TubeRush and delete your account at any time in Settings. We may stop providing the app. A store subscription continues until you cancel it with the store.',
            ],
        },
        { type: 'h2', text: 'Changes' },
        {
            type: 'p',
            content: [
                'We may update these terms by publishing a new version of this page and changing the date above. If you keep using TubeRush after an update, the new terms apply.',
            ],
        },
        { type: 'h2', text: 'Contact' },
        {
            type: 'p',
            content: ['Grant Hynd. Email: ', email, '.'],
        },
        { type: 'h2', text: 'Law' },
        {
            type: 'p',
            content: [
                'These terms are governed by the laws of England and Wales. The courts of England and Wales can hear disputes. That does not take away rights you have as a consumer in the country where you live.',
            ],
        },
    ],
};
