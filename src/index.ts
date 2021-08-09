import ora from 'ora';
import latestVersion from 'latest-version';
import chalk from 'chalk';
import compareSemver from 'semver-compare';

/** Returns true if already using latest version, else false. */
export async function npxLatest({ name, version }: {
  name: string;
  version: string;
}): Promise<boolean> {
  const spinner = ora().start('Ensuring latest version');
  const latestVer = await latestVersion(name);
  if (compareSemver(version, latestVer) === -1) {

    const string = `The current version of ${name} [${chalk.keyword('brown')(version)}] `
    + `is lower than the latest available version [${chalk.yellow(latestVer)}].`;
    // Will recall gev with @latest and will try to remove older cached versions.\n`

    spinner.info(string);

    const attempToCleanCache = true;

    if (attempToCleanCache) {


      let cachePath: string = (() => {
        switch (process.platform) {
          // From https://github.com/npm/cli/blob/deeb22235bf9b7d1727cafe581e54df9f8f19efb/lib/utils/config/definitions.js#L313
          case 'win32': return `%LocalAppData%\\npm-cache\\_npx`; // TODO in npm 6, it's just %AppData% https://docs.npmjs.com/cli/v6/commands/npm-cache#cache
          default: return `~/.npm/_npx`;
        }
      })();
    }


    fse.opendir();
    const rawProgramArgs = process.argv.slice(2);
    await execa('npx', ['gev@latest', '--no-check-latest', ...rawProgramArgs], {
      stdio: 'inherit',
      env: {
        npm_config_yes: 'true', // https://github.com/npm/cli/issues/2226#issuecomment-732475247
      },
    }).catch(null); // ignore throw here. It will already be treated in the @latest.
    return;
  } else { // Same version. We are running the latest one!
    spinner.succeed();
  }
}