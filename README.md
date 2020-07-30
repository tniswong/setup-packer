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

- id: plan
  run: packer plan -no-color

- run: echo ${{ steps.plan.outputs.stdout }}
- run: echo ${{ steps.plan.outputs.stderr }}
- run: echo ${{ steps.plan.outputs.exitcode }}
```

Outputs can be used in subsequent steps to comment on the pull request:

```yaml
defaults:
  run:
    working-directory: ${{ env.tf_actions_working_dir }}
steps:
- uses: actions/checkout@v2
- uses: tniswong/setup-packer@v1

- name: Packer fmt
  id: fmt
  run: packer fmt
  continue-on-error: true

- name: Packer Init
  id: init
  run: packer init

- name: Packer Validate
  id: validate
  run: packer validate -no-color

- name: Packer Plan
  id: plan
  run: packer plan -no-color
  continue-on-error: true

- uses: actions/github-script@0.9.0
  if: github.event_name == 'pull_request'
  env:
    PLAN: "packer\n${{ steps.plan.outputs.stdout }}"
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      const output = `#### Packer Format and Style 🖌\`${{ steps.fmt.outcome }}\`
      #### Packer Initialization ⚙️\`${{ steps.init.outcome }}\`
      #### Packer Validation 🤖${{ steps.validate.outputs.stdout }}
      #### Packer Plan 📖\`${{ steps.plan.outcome }}\`
      
      <details><summary>Show Plan</summary>
      
      \`\`\`${process.env.PLAN}\`\`\`
      
      </details>
      
      *Pusher: @${{ github.actor }}, Action: \`${{ github.event_name }}\`, Working Directory: \`${{ env.tf_actions_working_dir }}\`, Workflow: \`${{ github.workflow }}\`*`;
        
      github.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: output
      })
```

## Inputs

The following inputs are supported.

- `cli_config_credentials_hostname` - (optional) The hostname of a Packer Cloud/Enterprise instance to place within the credentials block of the Packer CLI configuration file. Defaults to `app.packer.io`.

- `cli_config_credentials_token` - (optional) The API token for a Packer Cloud/Enterprise instance to place within the credentials block of the Packer CLI configuration file.

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
