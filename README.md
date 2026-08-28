# TáblaWeb

Webes és mobil KRÉTA napló – órarend, jegyek, naptár, témák.

## Web (böngésző)

```bash
npm install
npm run dev
```

Nyisd: http://localhost:5173

## Mobil app (Capacitor – Android / iOS)

A webes UI-t natív héjba csomagolja (mint egy „WebView app”), Play/App Store buildhez.

### 1. Egyszeri telepítés

```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/splash-screen
npx cap add android   # Android Studio kell
npx cap add ios       # csak macOS + Xcode
```

### 2. Build + szinkron

```bash
npm run cap:sync
```

Ez lefuttatja a `vite build`-et és bemásolja a `dist/` tartalmát a natív projektbe.

### 3. Megnyitás IDE-ben

```bash
npm run cap:android   # Android Studio
npm run cap:ios       # Xcode (Mac)
```

Ezután futtasd emulátoron vagy USB-s telefonon.

### Fejlesztés élő reloaddal (opcionális)

`capacitor.config.ts` → `server.url`:

```ts
server: {
  url: 'http://192.168.1.10:5173', // a géped LAN IP-je
  cleartext: true,
}
```

Majd `npm run dev` + `npx cap sync` + app indítás.

### Bejelentkezés az appban

Ugyanaz, mint weben:
1. **Iskola + jelszó** (elsődleges)
2. Tartalék: **KRÉTA oldal** + code

Később natív WebView-s automata login is ráépíthető (Firka stílus).

## Adatforrások

- Órarend, jegyek, tanév: e-KRÉTA API
- Ünnepnapok: Nager.Date
- Szünetek: KRÉTA + OpenHolidays tartalék
- Intézménylista: kretaglobalapi publikus

## App azonosító

- `appId`: `hu.tablaweb.app`
- `appName`: TáblaWeb
