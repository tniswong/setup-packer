// Mock external modules by default
jest.mock('@actions/core');
jest.mock('@actions/tool-cache');
// Mock Node.js core modules
jest.mock('os');

const os = require('os');
const path = require('path');

const io = require('@actions/io');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const nock = require('nock');

const json = require('./index.json');
const setup = require('../lib/setup-packer');

// Overwrite defaults
// core.debug = jest
//   .fn(console.log);
// core.error = jest
//   .fn(console.error);

describe('Setup Packer', () => {
  const HOME = process.env.HOME;
  const APPDATA = process.env.APPDATA;

  beforeEach(() => {
    process.env.HOME = '/tmp/asdf';
    process.env.APPDATA = '/tmp/asdf';
  });

  afterEach(async () => {
    await io.rmRF(process.env.HOME);
    process.env.HOME = HOME;
    process.env.APPDATA = APPDATA;
  });

  test('gets specific version on linux, amd64', async () => {
    const version = '0.1.1';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file.zip');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    nock('https://releases.hashicorp.com')
      .get('/packer/index.json')
      .reply(200, json);

    await setup();

    // downloaded CLI has been added to path
    expect(core.addPath).toHaveBeenCalled();
  });

  test('gets specific version on windows, 386', async () => {
    const version = '0.1.1';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file.zip');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('win32');

    os.arch = jest
      .fn()
      .mockReturnValue('386');

    nock('https://releases.hashicorp.com')
      .get('/packer/index.json')
      .reply(200, json);

    await setup();

    // downloaded CLI has been added to path
    expect(core.addPath).toHaveBeenCalled();
  });

  test('gets latest version on linux, amd64', async () => {
    const version = 'latest';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file.zip');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    nock('https://releases.hashicorp.com')
      .get('/packer/index.json')
      .reply(200, json);

    await setup();

    // downloaded CLI has been added to path
    expect(core.addPath).toHaveBeenCalled();
  });

  test('fails when metadata cannot be downloaded', async () => {
    const version = 'latest';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    nock('https://releases.hashicorp.com')
      .get('/packer/index.json')
      .reply(404);

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('fails when specific version cannot be found', async () => {
    const version = '0.9.9';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    nock('https://releases.hashicorp.com')
      .get('/packer/index.json')
      .reply(200, json);

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('fails when CLI for os and architecture cannot be found', async () => {
    const version = '0.1.1';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    nock('https://releases.hashicorp.com')
      .get('/packer/index.json')
      .reply(200, json);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file.zip');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('madeupplat');

    os.arch = jest
      .fn()
      .mockReturnValue('madeuparch');

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('fails when CLI cannot be downloaded', async () => {
    const version = '0.1.1';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    nock('https://releases.hashicorp.com')
      .get('/packer/index.json')
      .reply(200, json);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('installs wrapper on linux', async () => {
    const version = '0.1.1';
    const wrapperPath = path.resolve([__dirname, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));

    const ioMv = jest.spyOn(io, 'mv')
      .mockImplementation(() => {});
    const ioCp = jest.spyOn(io, 'cp')
      .mockImplementation(() => {});

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version)
      .mockReturnValueOnce('true');

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file.zip');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    nock('https://releases.hashicorp.com')
      .get('/packer/index.json')
      .reply(200, json);

    await setup();

    expect(ioMv).toHaveBeenCalledWith(`file${path.sep}packer`, `file${path.sep}packer-bin`);
    expect(ioCp).toHaveBeenCalledWith(wrapperPath, `file${path.sep}packer`);
  });

  test('installs wrapper on windows', async () => {
    const version = '0.1.1';
    const wrapperPath = path.resolve([__dirname, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));

    const ioMv = jest.spyOn(io, 'mv')
      .mockImplementation(() => {});
    const ioCp = jest.spyOn(io, 'cp')
      .mockImplementation(() => {});

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version)
      .mockReturnValueOnce('true');

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file.zip');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('win32');

    os.arch = jest
      .fn()
      .mockReturnValue('386');

    nock('https://releases.hashicorp.com')
      .get('/packer/index.json')
      .reply(200, json);

    await setup();

    expect(ioMv).toHaveBeenCalledWith(`file${path.sep}packer.exe`, `file${path.sep}packer-bin.exe`);
    expect(ioCp).toHaveBeenCalledWith(wrapperPath, `file${path.sep}packer`);
  });
});
