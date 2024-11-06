[![Publish to GitHub Packages](https://github.com/NOAA-GSL/idsse-muppet/actions/workflows/publish-package.yml/badge.svg?event=release)](https://github.com/NOAA-GSL/idsse-muppet/actions/workflows/publish-package.yml)

# IDSSe MUPPET Library

**M**odern **U**I **P**eer-to-**P**eer **E**ven**t** (MUPPETs)

This is a React Javascript library for two or more React apps to connect to MUPPET data channels (WebRTC/websockets under the hood), then use simple, React-like interfaces to forward each other serialized UI events from their app (like user clicks, selections, or input) via the [MUPPETs protocol](https://docs.google.com/document/d/1TSvRtfzQGdclHGys9e0dLXKNnvWAmRnizH-biQW066o/view?usp=sharing).

## Table of Contents
- [IDSSe MUPPET Library](#idsse-muppet-library)
  - [Table of Contents](#table-of-contents)
  - [Usage](#usage)
    - [Log into GitHub's Package repo](#log-into-githubs-package-repo)
    - [Install the library](#install-the-library)
    - [Developer Guide](#developer-guide)
  - [Contributing](#contributing)
    - [Publishing](#publishing)

## Usage

### Log into GitHub's Package repo

Login to GitHub's NPM repository on the command line by following [this GitHub guide](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token).

If you already have a GitHub Personal Token with registry read access saved somewhere on your local machine (maybe an environment variable), skip straight to the command:

```sh
npm login --scope=@noaa-gsl --auth-type=legacy --registry=https://npm.pkg.github.com
```

entering your GitHub username as the username, and your generated GitHub personal token as the password (should be a 40-character string starting with "ghp\_").

This command is pointing NPM to GitHub's Package repository (rather than the default NPM address `registry.npmjs.org`) and logging in your CLI session as your GitHub user.

To check that this worked, run this command:

```sh
npm whoami --registry=https://npm.pkg.github.com
```

If it prints your GitHub account name, you're good to go. If it throws a `401` or `ENEEDAUTH`, your CLI session is still not logged in GitHub's Package repository.

### Install the library

```sh
npm install @noaa-gsl/idsse-muppet
```

Now you can use the MUPPET library to create new connections to a MUPPET channel and send/receive events over it in your React application.

### Developer Guide
For React apps, see the [Developer Guide - React](docs/react.md).

Although it's not recommended because it can be much harder to manage app state, if you want to use the underlying JS without the niceties of React Context or custom Hooks, see [Developer Guide - Vanilla JS](docs/vanilla-js.md)

## Contributing

1. Ensure you have [NPM](npmjs.com) installed locally
1. Clone this repository with `git clone <repo_url>`
1. Install any 3rd-party JS libraries needed by `cd`ing into your newly-cloned repo and running `npm install`

If you have changes you wish to be incorporated into the main branch, feel free to submit your feature branch for code review! Code should run quickly, quietly (without noisy console messages), and without crashing the page of a project that imports it.

### Publishing

To publish a new version of this package:

1. In the [package.json](https://github.com/NOAA-GSL/idsse-muppet/blob/main/package.json) file, increase the `version` number (either the patch or minor number are usually fine).
   1. This step is needed so NPM recognizes it as a new version for any repos that install it with `npm install`. If you don't do this, NPM will reject the publish due to a conflict with the last version, and the publish GitHub Action will fail.
2. Go to the [Releases](https://github.com/NOAA-GSL/idsse-muppet/releases) page on the GitHub repository and click "Draft a new release"
   1. Releases should be shown in a sidebar on the right of the `Code` page on GitHub.
3. Click the "Choose a tag" dropdown, then start typing a new version number in the text box
   1. This should start with "v", then the same version that you set in the `package.json` file in step 1.
   2. Click "Create new tag"
   3. Type a bullet point or two about what was changed, or click "Generate release notes" which just links to a diff between this version and the last.
4. Make sure "Set as pre-release" is _not_ checked
   1. This will ensure that projects using this library will download your new version the next time they run `npm install`.
   2. If "pre-release" is checked, it would still publish to NPM but not upgrade by default. Users of the library would have to "opt in" to this latest version by installing it explicitly, e.g. `npm install @noaa-gsl/idsse-muppet@v1.2.3-beta`
5. Click "Publish release"

That's it! A GitHub Action will be kicked off to auto-publish the new version to NPM. You can watch the status [on the Actions tab of GitHub](https://github.com/NOAA-GSL/idsse-muppet/actions).

Once that finishes, projects that use this library can run `npm install`, and NPM will upgrade them to the new version of this library in their project (in their package.json, or by running `npm ls | grep idsse-muppet`).
