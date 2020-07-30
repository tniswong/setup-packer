# setup-packer

<p align="left">
  <a href="https://github.com/tniswong/setup-packer/actions"><img alt="Continuous Integration" src="https://github.com/tniswong/setup-packer/workflows/Continuous%20Integration/badge.svg" /></a>
  <a href="https://github.com/tniswong/setup-packer/actions"><img alt="Setup Packer" src="https://github.com/tniswong/setup-packer/workflows/Setup%20Packer/badge.svg" /></a>
</p>

The `tniswong/setup-packer` action is a JavaScript action that sets up Packer CLI in your GitHub Actions workflow by:

- Downloading a specific version of Packer CLI and adding it to the `PATH`.
- Installing a wrapper script to wrap subsequent calls of the `packer` binary and expose its STDOUT, STDERR, and exit code as outputs named `stdout`, `stderr`, and `exitcode` respectively. (This can be optionally skipped if subsequent steps in the same job do not need to access the results of Packer commands.)

After you've used the action, subsequent steps in the same job can run arbitrary Packer commands using [the GitHub Actions `run` syntax](https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepsrun). This allows most Packer commands to work exactly like they do on your local command line.

## Usage

This action can be run on `ubuntu-latest`, `windows-latest`, and `macos-latest` GitHub Actions runners. When running on `windows-latest` the shell should be set to Bash.

The default configuration installs the latest version of Packer CLI and installs the wrapper script to wrap subsequent calls to the `packer` binary.

```yaml
steps:
- uses: tniswong/setup-packer@v1
```

A specific version of Packer CLI can be installed.

```yaml
steps:
- uses: tniswong/setup-packer@v1
  with:
    packer_version: 1.6.0
```

The wrapper script installation can be skipped.

```yaml
steps:
- uses: tniswong/setup-packer@v1
  with:
    packer_wrapper: false
```

Subsequent steps can access outputs when the wrapper script is installed.


```yaml
steps:
- uses: tniswong/setup-packer@v1

- run: packer verify

- id: verify
  run: packer verify

- run: echo ${{ steps.verify.outputs.stdout }}
- run: echo ${{ steps.verify.outputs.stderr }}
- run: echo ${{ steps.verify.outputs.exitcode }}
```

## Inputs

The following inputs are supported.

- `packer_version` - (optional) The version of Packer CLI to install. A value of `latest` will install the latest version of Packer CLI. Defaults to `latest`.

- `packer_wrapper` - (optional) Whether or not to install a wrapper to wrap subsequent calls of the `packer` binary and expose its STDOUT, STDERR, and exit code as outputs named `stdout`, `stderr`, and `exitcode` respectively. Defaults to `true`.

## Outputs

This action does not configure any outputs directly. However, when the `packer_wrapper` input is set to `true`, the following outputs will be available for subsequent steps that call the `packer` binary.

- `stdout` - The STDOUT stream of the call to the `packer` binary.

- `stderr` - The STDERR stream of the call to the `packer` binary.

- `exitcode` - The exit code of the call to the `packer` binary.

## License

[Mozilla Public License v2.0](https://github.com/tniswong/setup-packer/blob/master/LICENSE)

## Code of Conduct

[Code of Conduct](https://github.com/tniswong/setup-packer/blob/master/CODE_OF_CONDUCT.md)
