// Writes the latest published SDK versions into components/docs/sdk-versions.json
// before every build, so the docs never need a manual version edit.
// Never fails the build: if a registry is unreachable, the committed file stays.
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../components/docs/sdk-versions.json', import.meta.url);
const current = JSON.parse(readFileSync(file, 'utf8'));

async function latest(url, pick) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return undefined;
    const version = pick(await res.json());
    return /^\d+\.\d+\.\d+$/.test(version ?? '') ? version : undefined;
  } catch {
    return undefined;
  }
}

const next = {
  reactNative: (await latest('https://registry.npmjs.org/@pixlpush/react-native/latest', (j) => j.version)) ?? current.reactNative,
  flutter: (await latest('https://pub.dev/api/packages/pixlpush', (j) => j.latest?.version)) ?? current.flutter,
  web: (await latest('https://registry.npmjs.org/@pixlpush/web/latest', (j) => j.version)) ?? current.web,
  php: (await latest('https://repo.packagist.org/p2/pixlpush/pixlpush-php.json', (j) => j.packages?.['pixlpush/pixlpush-php']?.[0]?.version?.replace(/^v/, ''))) ?? current.php,
  wordpress: (await latest('https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=pixlpush', (j) => j.version)) ?? current.wordpress,
};

if (JSON.stringify(next) !== JSON.stringify(current)) writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
console.log(`SDK versions: react-native ${next.reactNative}, flutter ${next.flutter}, web ${next.web}, php ${next.php}, wordpress ${next.wordpress}`);
