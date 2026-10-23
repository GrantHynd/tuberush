// Bundled copies of the HTML pages. The edge runtime only ships imported modules,
// so reading the .html files at runtime crashes the function.

export const privacyHtml = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Privacy Policy — TubeRush</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      background: #fff;
      color: #111;
      font: 17px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main { max-width: 40rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 0.25rem; }
    h2 { font-size: 1.25rem; margin: 2rem 0 0.5rem; }
    p, li { margin: 0.6rem 0; }
    ul { padding-left: 1.25rem; }
    a { color: #003688; }
    .meta { color: #4b5563; margin-top: 0; }
    footer { margin-top: 2.5rem; color: #4b5563; }
  </style>
</head>
<body>
  <main>
    <h1>Privacy Policy</h1>
    <p class="meta">TubeRush · Last updated 23 October 2026</p>

    <p>TubeRush is a daily word-game app. This policy explains what the app collects, who processes it, and how you can delete it. It covers your account, gameplay, subscriptions, and the services the app uses: Supabase, PostHog, Sentry, and the Apple and Google in-app purchase systems.</p>

    <h2>Who we are</h2>
    <p>TubeRush is operated by Grant Hynd. For privacy questions or requests, email <a href="mailto:grant.hynd@gmail.com">grant.hynd@gmail.com</a>.</p>

    <h2>Information we collect</h2>
    <p><strong>Account.</strong> When you create an account we collect your email address, a username, and a password. Supabase stores the password as a hash. We do not see or store the raw password.</p>
    <p><strong>Profile.</strong> You can optionally set a UK city or town. If you choose London, you can also set a borough. We use this for leaderboards.</p>
    <p><strong>Gameplay.</strong> We store puzzle progress, scores, and custom puzzles you create. A copy is kept on your device so you can play offline, and it syncs to your account when you are signed in and online.</p>
    <p><strong>In-app purchases.</strong> TubeRush Pro is an auto-renewable subscription sold through Apple or Google. The store processes the payment. We do not receive your card number, billing address, or full payment details. RevenueCat receives your TubeRush account id and your subscription status, including whether it is active and which plan you bought, so the app can unlock premium features.</p>
    <p><strong>Product analytics.</strong> We use PostHog, with data sent to its EU host (<code>eu.i.posthog.com</code>), to understand how the app is used. We record events such as opening the app, signing in or out, playing a game, and opening the subscription screen. After you sign in, those events are tied to your account id and email. If you update your city or borough, that location is included on that event. Session replay is off. The app keeps analytics in memory on the device rather than in a local analytics database.</p>
    <p><strong>Crash reports.</strong> Release builds send crash and error reports to Sentry. A report can include a stack trace, device and operating system details, and, when you are signed in, your account id, email, and username. Crash reporting is disabled in development builds. We do not send payment details to Sentry.</p>
    <p>We do not sell your personal information, and the app does not show third-party advertising.</p>

    <h2>Leaderboards</h2>
    <p>Other signed-in players can see your username, city or borough, and score. Your email address is not shown on the leaderboard.</p>

    <h2>How we use information</h2>
    <p>We use this information to create and secure your account, save games, show leaderboards, unlock TubeRush Pro, understand which features people use, and fix crashes.</p>

    <h2>Service providers</h2>
    <ul>
      <li><strong>Supabase</strong> stores accounts, profiles, game progress, scores, and custom puzzles, and handles sign-in.</li>
      <li><strong>PostHog</strong> (EU) processes product analytics.</li>
      <li><strong>Sentry</strong> processes crash and error reports.</li>
      <li><strong>RevenueCat</strong> processes subscription status for in-app purchases.</li>
      <li><strong>Apple</strong> and <strong>Google</strong> process in-app purchase payments and keep the receipt in your store account.</li>
    </ul>
    <p>They process this information so we can run TubeRush. PostHog is configured for the EU. Supabase, Sentry, RevenueCat, Apple, and Google may process information in the UK, the EEA, or the United States under their own terms.</p>

    <h2>How long we keep it</h2>
    <p>We keep account and gameplay data until you delete your account. PostHog and Sentry keep analytics and crash reports under their own retention settings. Apple, Google, and RevenueCat keep purchase records so the subscription can be provided.</p>

    <h2>Deleting your account</h2>
    <p>In the app, open Settings and choose Delete Account. That permanently deletes your profile, scores, saved games, custom puzzles, and login from our database, and clears the copy stored on that device.</p>
    <p>Deleting your account does not cancel an Apple or Google Play subscription. Cancel that in your store account settings, or it keeps renewing.</p>
    <p>Events already sent to PostHog, and crash reports already sent to Sentry, are not erased automatically. Email <a href="mailto:grant.hynd@gmail.com">grant.hynd@gmail.com</a> and we will pass a deletion request to those providers where they allow it.</p>

    <h2>Your rights</h2>
    <p>If you are in the UK or the EEA you can ask for a copy of your information, ask us to correct it, and ask us to delete it. You can also complain to the Information Commissioner’s Office at <a href="https://ico.org.uk">ico.org.uk</a>. Email <a href="mailto:grant.hynd@gmail.com">grant.hynd@gmail.com</a> to make a request.</p>

    <h2>Children</h2>
    <p>TubeRush is not directed at children under 16. We do not knowingly collect information from children under 16. If you believe a child has given us personal information, email us and we will delete it.</p>

    <h2>Changes</h2>
    <p>If we change this policy we will update the date at the top and publish the new version at this address.</p>

    <h2>Contact</h2>
    <p>Grant Hynd<br />Email: <a href="mailto:grant.hynd@gmail.com">grant.hynd@gmail.com</a></p>

    <footer>
      <a href="terms.html">Terms of Use</a>
    </footer>
  </main>
</body>
</html>
`;

export const termsHtml = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Terms of Use — TubeRush</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      background: #fff;
      color: #111;
      font: 17px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main { max-width: 40rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 0.25rem; }
    h2 { font-size: 1.25rem; margin: 2rem 0 0.5rem; }
    p, li { margin: 0.6rem 0; }
    ul { padding-left: 1.25rem; }
    a { color: #003688; }
    .meta { color: #4b5563; margin-top: 0; }
    footer { margin-top: 2.5rem; color: #4b5563; }
  </style>
</head>
<body>
  <main>
    <h1>Terms of Use</h1>
    <p class="meta">TubeRush · Last updated 23 October 2026</p>

    <p>These terms are the end user licence agreement (EULA) for the TubeRush app. By creating an account or buying a subscription, you agree to them. Apple’s or Google’s terms also apply to the download and to payments made through that store.</p>

    <h2>The service</h2>
    <p>TubeRush is a word-game app. Some games are free. Crossword puzzles and other premium features require TubeRush Pro, which the app shows as 1st Class membership.</p>

    <h2>Accounts</h2>
    <p>You need an account to save progress and appear on leaderboards. You are responsible for activity on your account. Use an email address you can open, so you can reset your password.</p>

    <h2>Acceptable use</h2>
    <p>Do not misuse the app, try to access another player’s account, or interfere with the service. We may suspend an account that does this.</p>

    <h2>Subscriptions and in-app purchases</h2>
    <p>TubeRush Pro is an auto-renewable subscription, sold as an in-app purchase on a monthly plan and a yearly plan.</p>
    <ul>
      <li>The subscription title is TubeRush Pro.</li>
      <li>The length is one month or one year, as shown on the purchase screen before you confirm.</li>
      <li>The price is shown in your local currency on the purchase screen before you confirm. Payment is charged to your Apple ID or Google Play account.</li>
      <li>The subscription renews unless you cancel at least 24 hours before the end of the current period.</li>
      <li>Your store account is charged for renewal within 24 hours before the current period ends.</li>
      <li>Manage or cancel the subscription in your App Store or Google Play account settings. Deleting your TubeRush account does not cancel it.</li>
    </ul>
    <p>We do not store your card number. Apple or Google processes the payment. RevenueCat receives your account id and subscription status so the app can tell whether TubeRush Pro is active. The <a href="privacy.html">Privacy Policy</a> describes the account, gameplay, analytics, crash, and purchase data those services handle.</p>

    <h2>Cancellation and refunds</h2>
    <p>Cancel in your store account settings. Refunds are handled by Apple or Google under their policies. TubeRush cannot refund a store purchase from inside the app.</p>

    <h2>Your content</h2>
    <p>Custom puzzles you create stay yours. You let us store them so the app can show them to you. Daily puzzles, the app, and its design belong to TubeRush. Do not copy them to build a competing service.</p>

    <h2>Leaderboards</h2>
    <p>Your username, city or borough, and score may be shown to other players. Choose a username you are happy for other players to see.</p>

    <h2>The service as available</h2>
    <p>Puzzles are for entertainment. We do not promise that TubeRush will always be available or free of errors.</p>

    <h2>Liability</h2>
    <p>Nothing in these terms limits liability that cannot legally be limited, including liability for death or personal injury caused by negligence, or for fraud. Subject to that, we are not liable for loss of scores, data, or profits, or for indirect loss arising from your use of the app.</p>

    <h2>Ending these terms</h2>
    <p>You can stop using TubeRush and delete your account at any time in Settings. We may stop providing the app. A store subscription continues until you cancel it with the store.</p>

    <h2>Changes</h2>
    <p>We may update these terms by publishing a new version at this address and changing the date above. If you keep using TubeRush after an update, the new terms apply.</p>

    <h2>Contact</h2>
    <p>Grant Hynd<br />Email: <a href="mailto:grant.hynd@gmail.com">grant.hynd@gmail.com</a></p>

    <h2>Law</h2>
    <p>These terms are governed by the laws of England and Wales. The courts of England and Wales can hear disputes. That does not take away rights you have as a consumer in the country where you live.</p>

    <footer>
      <a href="privacy.html">Privacy Policy</a>
    </footer>
  </main>
</body>
</html>
`;
