# Social Auth Setup

The repo is ready for Google and Apple sign-in. The remaining work is external configuration.

## 1. Create your local env file

Copy `.env.example` to `.env` and fill in:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

## 2. Google Cloud Console

Create OAuth client IDs for:

- iOS app
- Android app
- Web application

Use these app identifiers from this repo:

- iOS bundle ID: `com.linkgroup.labourlink`
- Android package: `com.zakariyahage.labourlink`

Put the resulting client IDs into `.env`.

## 3. Apple Developer

For bundle ID `com.linkgroup.labourlink`:

- enable `Sign In with Apple`
- save the capability

## 4. Restart services

Run the backend:

```bash
npm run api
```

Run the Expo app:

```bash
npm start
```

## 5. Rebuild native app

Because native auth packages were added, rebuild before testing:

```bash
npx expo run:ios
```

or

```bash
npx expo run:android
```

## 6. Test flows

- Google sign in from login
- Google sign in from register
- Apple sign in on iOS
- first-time social user goes to onboarding
- returning social user goes straight to home

## Notes

- Backend social endpoints are `/auth/social/google` and `/auth/social/apple`.
- Pending users finish setup in `app/auth/onboarding.tsx`.
- If Google sign-in says it is not configured, your `.env` client IDs are missing or Expo was not restarted.
