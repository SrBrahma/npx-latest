import os from 'os';
import path from 'path';
import chalk from 'chalk';
import { execa } from 'execa';
import fse from 'fs-extra';
import { globby } from 'globby';
import getLatestVersion from 'latest-version';
import { oraPromise } from 'ora';
import semverCompare from 'semver-compare';


/** Linux returns an array of '/home/hb/.npm/_npx/fd5fb8ad65b925ff/package.json' */
async function getCachePkgJsons(): Promise<string[]> {
  switch (process.platform) {
    // From https://github.com/npm/cli/blob/deeb22235bf9b7d1727cafe581e54df9f8f19efb/lib/utils/config/definitions.js#L313
    case 'win32': {
      const npmVersion = (await execa('npx', ['-v'])).stdout;
      // In npm 6, it's %AppData% https://docs.npmjs.com/cli/v6/commands/npm-cache#cache
      // if (compareSemver(npmVersion, '7.0.0') === -1)
      return [];
      //   return '%AppData%/npm-cache' // TODO probably globby doesn't like those two
      // return '%LocalAppData%/npm-cache/_npx';
    }
    default:
      return await globby('.npm/_npx/**/package.json', { cwd: os.homedir(), deep: 2, absolute: true });
  }
}

// /** Returns true if already using latest version, else false. */
export async function npxLatest({ name, version, clearCache = true }: {
  name: string;
  version: string;
  /** @default true */
  clearCache?: boolean;
}): Promise<void> {
  await oraPromise(async (spinner) => {

    const latestVersion = await getLatestVersion(name);

    const isOld = semverCompare(version, latestVersion) === -1;

    if (!isOld)
      return;

    spinner.info(`The current version of ${name} [${chalk.keyword('brown')(version)}] `
      + `is lower than the latest available version [${chalk.yellow(latestVersion)}]. Will`);

    // We clear cache because even if we get the prog@latest, calling npx prog next time may still lead to the older version.
    if (clearCache) {
      const pkgJsons = await getCachePkgJsons();

      // They pkgs follow this pattern. Looks like they all have just 1 dep.
      // { "dependencies": { "gev": "2.6.1" } }
      await Promise.all((pkgJsons).map(async (p) => {
        const content = await fse.readJSON(p);
        const foundVersion: string | undefined = content.dependencies[name];
        // Remove older versions of the package
        if (foundVersion && semverCompare(foundVersion, latestVersion) === -1)
          await fse.remove(path.join(p, '..'));
      }));
    }


    // const rawProgramArgs = process.argv.slice(2);
    // await execa('npx', ['gev@latest', '--no-check-latest', ...rawProgramArgs], {
    //   stdio: 'inherit',
    //   env: {
    //     npm_config_yes: 'true', // https://github.com/npm/cli/issues/2226#issuecomment-732475247
    //   },
    // }).catch(null); // [edit: what?] ignore throw here. It will already be treated in the @latest.

  }, 'Ensuring latest version');
}

npxLatest({ name: 'gev', version: '2.5.0' });