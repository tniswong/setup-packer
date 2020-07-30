// Node.js core
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

// External
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const fetch = require('node-fetch');
const semver = require('semver');

// Find latest version given list of all available
function findLatest (allVersions) {
  core.debug('Parsing version list for latest version');

  let latest = '0.0.0';

  for (const version in allVersions.versions) {
    // Ignore pre-release
    if (semver.prerelease(version) !== null) {
      continue;
    }
    // is "version" greater than "latest"
    latest = semver.gt(version, latest) ? version : latest;
  }

  core.info(`Latest version is ${latest}`);

  return allVersions.versions[latest];
}

// Find specific version given list of all available
function findSpecific (allVersions, version) {
  core.debug(`Parsing version list for version ${version}`);

  const versionObj = allVersions.versions[version];

  if (!versionObj) {
    throw new Error(`Could not find Packer version ${version} in version list`);
  }

  return versionObj;
}

async function downloadMetadata () {
  core.debug('Downloading version metadata');

  return fetch('https://releases.hashicorp.com/packer/index.json')
    .then(res => res.json())
    .catch(err => {
      core.setFailed(`Failed to fetch version metadata. ${err}`);
    });
}

// arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// return value in [amd64, 386, arm]
function mapArch (arch) {
  const mappings = {
    x32: '386',
    x64: 'amd64'
  };
  return mappings[arch] || arch;
}

// os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// return value in [darwin, linux, windows]
function mapOS (os) {
  const mappings = {
    win32: 'windows'
  };
  return mappings[os] || os;
}

// Get build for an operating system and architecture
function getBuild (versionObj, os, arch) {
  core.debug(`Getting build for Packer version ${versionObj.version}, os ${os}, and arch ${arch}`);

  const buildObj = versionObj.builds.length &&
    versionObj.builds.find(build =>
      build.arch === mapArch(arch) &&
        build.os === mapOS(os)
    );

  if (!buildObj) {
    throw new Error(`Packer version ${versionObj.version} not available for ${os} and ${arch}`);
  }

  return buildObj;
}

async function downloadCLI (url) {
  core.debug(`Downloading Packer CLI from ${url}`);
  const pathToCLIZip = await tc.downloadTool(url);

  core.debug('Extracting Packer CLI zip file');
  const pathToCLI = await tc.extractZip(pathToCLIZip);
  core.debug(`Packer CLI path is ${pathToCLI}.`);

  if (!pathToCLIZip || !pathToCLI) {
    throw new Error(`Unable to download Packer from ${url}`);
  }

  return pathToCLI;
}

async function installWrapper (pathToCLI) {
  let source, target;

  // If we're on Windows, then the executable ends with .exe
  const exeSuffix = os.platform().startsWith('win') ? '.exe' : '';

  // Rename packer(.exe) to packer-bin(.exe)
  try {
    source = [pathToCLI, `packer${exeSuffix}`].join(path.sep);
    target = [pathToCLI, `packer-bin${exeSuffix}`].join(path.sep);
    core.debug(`Moving ${source} to ${target}.`);
    await io.mv(source, target);
  } catch (e) {
    core.error(`Unable to move ${source} to ${target}.`);
    throw e;
  }

  // Install our wrapper as packer
  try {
    source = path.resolve([__dirname, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));
    target = [pathToCLI, 'packer'].join(path.sep);
    core.debug(`Copying ${source} to ${target}.`);
    await io.cp(source, target);
  } catch (e) {
    core.error(`Unable to copy ${source} to ${target}.`);
    throw e;
  }

  // Export a new environment variable, so our wrapper can locate the binary
  core.exportVariable('PACKER_CLI_PATH', pathToCLI);
}

// Add credentials to CLI Configuration File
// https://www.packer.io/docs/commands/cli-config.html
async function addCredentials (credentialsHostname, credentialsToken, osPlat) {
  // format HCL block
  // eslint-disable
  const creds = `
credentials "${credentialsHostname}" {
  token = "${credentialsToken}"
}`.trim();
  // eslint-enable

  // default to OS-specific path
  let credsFile = osPlat === 'win32'
    ? `${process.env.APPDATA}/packer.rc`
    : `${process.env.HOME}/.packerrc`;

  // override with TF_CLI_CONFIG_FILE environment variable
  credsFile = process.env.TF_CLI_CONFIG_FILE ? process.env.TF_CLI_CONFIG_FILE : credsFile;

  // get containing folder
  const credsFolder = path.dirname(credsFile);

  core.debug(`Creating ${credsFolder}`);
  await io.mkdirP(credsFolder);

  core.debug(`Adding credentials to ${credsFile}`);
  await fs.writeFile(credsFile, creds);
}

async function run () {
  try {
    // Gather GitHub Actions inputs
    const version = core.getInput('packer_version');
    const credentialsHostname = core.getInput('cli_config_credentials_hostname');
    const credentialsToken = core.getInput('cli_config_credentials_token');
    const wrapper = core.getInput('packer_wrapper') === 'true';

    // Gather OS details
    const osPlat = os.platform();
    const osArch = os.arch();

    // Download metadata about all versions of Packer CLI
    const versionMetadata = await downloadMetadata();

    // Find latest or a specific version like 0.1.0
    const versionObj = version.toLowerCase() === 'latest' ? findLatest(versionMetadata) : findSpecific(versionMetadata, version);

    // Get the build available for this runner's OS and a 64 bit architecture
    const buildObj = getBuild(versionObj, osPlat, osArch);

    // Download requested version
    const pathToCLI = await downloadCLI(buildObj.url);

    // Install our wrapper
    if (wrapper) {
      await installWrapper(pathToCLI);
    }

    // Add to path
    core.addPath(pathToCLI);

    // Add credentials to file if they are provided
    if (credentialsHostname && credentialsToken) {
      await addCredentials(credentialsHostname, credentialsToken, osPlat);
    }
  } catch (error) {
    core.error(error);
    throw new Error(error);
  }
}

module.exports = run;
