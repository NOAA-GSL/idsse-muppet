[![Publish to GitHub Packages](https://github.com/NOAA-GSL/idsse-webrtc-client/actions/workflows/publish-package.yml/badge.svg?event=release)](https://github.com/NOAA-GSL/idsse-webrtc-client/actions/workflows/publish-package.yml)

# IDSSe WebRTC Client

React Javascript library to connect to WebRTC data channels, and send/receive messages in simple interfaces using the [MUPPETs protocol](https://docs.google.com/document/d/1TSvRtfzQGdclHGys9e0dLXKNnvWAmRnizH-biQW066o/view?usp=sharing).

## Table of Contents
- [IDSSe WebRTC Client](#idsse-webrtc-client)
  - [Table of Contents](#table-of-contents)
  - [Usage](#usage)
    - [Log into GitHub's Package repo](#log-into-githubs-package-repo)
    - [Install the library](#install-the-library)
    - [Initialize a new WebRTC channel](#initialize-a-new-webrtc-channel)
      - [React (recommended)](#react-recommended)
      - [Vanilla Javascript](#vanilla-javascript)
    - [Send and Receive Messages](#send-and-receive-messages)
      - [Receive messages](#receive-messages)
      - [Broadcast a message](#broadcast-a-message)
      - [Send an RPC message](#send-an-rpc-message)
    - [Connect to other clients](#connect-to-other-clients)
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
npm install @noaa-gsl/idsse-webrtc-client
```

Now you can use the IDSSe WebRTC library to create new connections to a WebRTC channel and send/receive events over it in your React application.

### Initialize a new WebRTC channel

#### React (recommended)
TODO

#### Vanilla Javascript
You can create a WebRtcChannel instance manually, outside of any React context.

Example:
```javascript
const channel = new WebRtcChannel({
    clientName: 'MY_APP',
    room: 'some-room-on-webrtc-server',
    serverUrl: 'http://example.com',
    serverPath: '/',
});
```

The WebRTC room that you can be any string, but this is how the other client you are connecting to will find your app so the 2 apps can negotiate their peer-to-peer connection.  Any other WebRTC client that joins this room on the server will attempt to make a peer-to-peer websocket connection to your client.

> For reliability, it's recommended that this room is unique to your session/browser ("my-room-abc123", for example, instead of just "my-room"). Consider establishing with the app you're integrating with some shared nonce or algorithm to generate a new room for each new user session, so user A using your app will not have problems with user B's click actions taking effect in their session.

TODO: decide on some algorithm or method to share WebRTC room names before connection.

TODO: security recommendations

### Send and Receive Messages

Since WebRTC itself has no rules or conventions on how data sent over channels should be organized, the [Modern UI Peer-to-Peer Events (MUPPET) protocol](https://docs.google.com/document/d/1TSvRtfzQGdclHGys9e0dLXKNnvWAmRnizH-biQW066o/view?usp=sharing) defines a consistent JSON structure for messaging, so you can effectively share your Javascript app's user events over WebRTC with another app.

#### Receive messages
Once you instantiated a new `WebRtcChannel`, you can use this channel connection to wire up event listeners to run a callback when your channel receives a specific eventClass, using `WebRtcChannel.on()`.

Example:
```javascript
channel.on('THEIR_APP.WEATHER_FIELD_CHANGED', (receivingChannel, evt) => {
    // the attributes inside the event are completely up to the sender;
    // ideally this structure was declared in a SCHEMAS event prior
    const { field, issueDt } = evt;
    console.log(
        `Weather field ${field} with issue ${issueDt} was selected`
    );
});
```
> Note: you will need to coordinate with the app you're integrating with to determine the eventClass constants that it plans to send you. According to MUPPET conventions, it should be declared in a `SCHEMAS` eventClass message that the other app sends you immediately after you both connect.

#### Broadcast a message
To broadcast a MUPPET message over your new WebRtcChannel, simply pass your MUPPET event to `WebRtcChannel.sendEvent()`.

This can (and generally should) be invoked right in the `onClick` callback of some Button, or an `onSelect` of an HTML Select element, for example.

Example:
```javascript
const channel = new WebRtcChannel(/* <params> */);

<button
  onClick={() => {
    channel.sendEvent('MY_APP.PROFILE_SELECTED', {
      userId: '12345',
      userName: 'John Smith'
    });
  }
}
>
  Use this profile
</button>
```

#### Send an RPC message
To send a MUPPET message that is expected to receive some response from the receiver, call `WebRtcChannel.sendRequest()`.

This method call is intended to imitate the standard `fetch()` Javascript API, where the result can be `await()`ed until the receiving app either sends a matching MUPPET message in response, or the request times out.

Example:
```javascript
import { useState } from 'react';

const [phoneNumber, setPhoneNumber] = useState('');
const channel = new WebRtcChannel(/* <params> */);

<div>
    <button
        onClick={async () => {
            try {
                const res = await channel.sendRequest({
                    eventClass: 'MY_APP.GET_USER_PHONE',
                    event: { userId: 'abc-123' },
                    destination: 'THEIR_APP',
                });
                setPhoneNumber(res.event.phoneNumber);
            } catch (err) {
                console.error('Failed to get phone number from THEIR_APP');
                setPhoneNumber('ERR');
            }
        }
    }
    >
        Lookup phone number
    </button>

    <p>User phone number:</p>
    <p>{phoneNumber}</p>
</div>
```


### Connect to other clients
Your channel will not attempt to establish a connection to other WebRTC clients until you call the asynchronous `.connect()`.

```javascript
const channel = new WebRtcChannel(/* <params> */);
await channel.connect();
```

It's recommended that you set up all event listeners (see "Receive messages" section above) before connecting, as events could begin to flow immediately after the WebRtcChannel connects successfully, and if your event listener is not setup beforehand you may miss those events. At this time there is no replay of messages.

> Note: if you or another WebRTC client attempts to send events over a channel before a 2nd client is connected, the messages will be temporarily held in an in-memory queue in the sender's app (will not disappear).
>
> As soon as both apps have connected to the same WebRtcChannel, all of these pending messages will be "replayed"--sent over the channel--so the receiver can receive them.

## Contributing

1. Ensure you have [NPM](npmjs.com) installed locally
1. Clone this repository with `git clone <repo_url>`
1. Install any 3rd-party JS libraries needed by `cd`ing into your newly-cloned repo and running `npm install`

If you have changes you wish to be incorporated into the main branch, feel free to submit your feature branch for code review! Code should run quickly, quietly (without noisy console messages), and without crashing the page of a project that imports it.

### Publishing

To publish a new version of this package:

1. In the [package.json](https://github.com/NOAA-GSL/idsse-webrtc-client/blob/main/package.json) file, increase the `version` number (either the patch or minor number are usually fine).
   1. This step is needed so NPM recognizes it as a new version for any repos that install it with `npm install`. If you don't do this, NPM will reject the publish due to a conflict with the last version, and the publish GitHub Action will fail.
2. Go to the [Releases](https://github.com/NOAA-GSL/idsse-webrtc-client/releases) page on the GitHub repository and click "Draft a new release"
   1. Releases should be shown in a sidebar on the right of the `Code` page on GitHub.
3. Click the "Choose a tag" dropdown, then start typing a new version number in the text box
   1. This should start with "v", then the same version that you set in the `package.json` file in step 1.
   2. Click "Create new tag"
   3. Type a bullet point or two about what was changed, or click "Generate release notes" which just links to a diff between this version and the last.
4. Make sure "Set as pre-release" is _not_ checked
   1. This will ensure that projects using this library will download your new version the next time they run `npm install`.
   1. If "pre-release" is checked, it would still publish to NPM but not upgrade by default. Users of the library would have to "opt in" to this latest version by installing it explicitly, e.g. `npm install @noaa-gsl/idsse-webrtc-client@v1.2.3-beta`
5. Click "Publish release"

That's it! A GitHub Action will be kicked off to auto-publish the new version to NPM. You can watch the status [on the Actions tab of GitHub](https://github.com/NOAA-GSL/idsse-webrtc-client/actions).

Once that finishes, projects that use this library can run `npm install`, and NPM will upgrade them to the new version of this library in their project (in their package.json, or by running `npm ls | grep idsse-webrtc-client-client`).
