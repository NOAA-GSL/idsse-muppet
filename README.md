[![Publish to GitHub Packages](https://github.com/NOAA-GSL/idsse-muppet-client/actions/workflows/publish-package.yml/badge.svg?event=release)](https://github.com/NOAA-GSL/idsse-muppet-client/actions/workflows/publish-package.yml)

# IDSSe MUPPET Client

React Javascript library to connect to MUPPET data channels, and send/receive messages in simple interfaces using the [MUPPETs protocol](https://docs.google.com/document/d/1TSvRtfzQGdclHGys9e0dLXKNnvWAmRnizH-biQW066o/view?usp=sharing).

## Table of Contents
- [IDSSe MUPPET Client](#idsse-muppet-client)
  - [Table of Contents](#table-of-contents)
  - [Usage](#usage)
    - [Log into GitHub's Package repo](#log-into-githubs-package-repo)
    - [Install the library](#install-the-library)
    - [Initialize a new MUPPET channel](#initialize-a-new-muppet-channel)
      - [React (recommended)](#react-recommended)
      - [Vanilla Javascript](#vanilla-javascript)
    - [Send and Receive Events](#send-and-receive-events)
      - [Receive events](#receive-events)
      - [Broadcast an event](#broadcast-an-event)
      - [Send an RPC request](#send-an-rpc-request)
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
npm install @noaa-gsl/idsse-muppet-client
```

Now you can use the IDSSe MUPPET library to create new connections to a MUPPET channel and send/receive events over it in your React application.

### Initialize a new MUPPET channel

#### React (recommended)
First, in your `main.jsx` file, add a `<MuppetProivder>` component wrapping your main React app component. Pass the Provider a string array `channels`, which is a list of WebRTC rooms on the server you wish to connect to.

```javascript
// main.jsx
import ReactDOM from 'react-dom/client';
import { MuppetProvider } from '@noaa-gsl/idsse-muppet-client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <MuppetProvider
    clientName='MY_APP'
    serverUrl='http://example.com'
    serverPath='/'
    channels={['my-channel']}
  >
    <App>
  </MuppetProvider>
);
```

These channel name(s) should be coordinated beforehand with the other web apps you wish to communicate via MUPPET; your app and the other app must connect to the same channel on the server for the apps to "find each other" (negotiate a peer-to-peer websocket) and start sending messages. You can pass any number of channels to the Provider, which will attempt to create individual connections to each channel listed.

This Provider now stores an app-wide React Context for you, so any components in your app can reuse the same persistant `MuppetChannel` by just calling the `useMuppetChannel()` React hook with one of the channel names.

```javascript
// MyComponent.jsx
import { useMuppetChannel } from '@noaa-gsl/idsse-muppet-client';

function MyComponent () {
  const channel = useMuppetChannel('my-channel');

  const onButtonClick = () => {
    channel?.sendEvent({
      eventClass: 'MY_APP.SOME_EVENT',
      event: { value: 123 }
    });
  };

  return (
    <button onClick={onButtonClick}>
      Hello world
    </button>
  );
}

export default MyComponent;
```

 Note the component must know the "channel name" string given to `MuppetProvider`, so it can reference the `MuppetChannel` object it wants to use, as multiple channels can be stored in MuppetProvider Context. In the example above, the exact channel name is `my-channel`, but if a non-existent channel was requested by the component, the `useMuppetChannel()` hook would return `undefined`.

#### Vanilla Javascript
You can also create a MuppetChannel instance manually, outside of any React context.

Example:
```javascript
const channel = new MuppetChannel({
    clientName: 'MY_APP',
    room: 'some-room-on-the-server',
    serverUrl: 'http://example.com',
    serverPath: '/',
});
```

> For reliability, it's recommended that this room is unique to your session/browser ("my-room-abc123", for example, instead of just "my-room"). Consider establishing with the app with which you're integrating some shared nonce or algorithm to generate a new room for each new user session, so user A using your app will not have problems with user B's click actions taking effect in their session.
>
> If you're using the React approach, `MuppetProvider` handles this for you by generating a "fingerprint" unique to this browser user and prepending it to the WebRTC room you passed before attempting to connect, e.g. `4zd9jp:some-room-on-the-server`. Other apps running on this browser that use this library will generate the same nonce, and so find each other on the WebRTC signaling server.

TODO: decide on some algorithm or method to share WebRTC room names before connection.

TODO: security recommendations

Once you instantiated a new `MuppetChannel`, you can use this channel connection to wire up event listeners to run callbacks when your channel receives a specific eventClass, using `MuppetChannel.on()`.

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

After you've established all the event listeners you want, you have to tell your `MuppetChannel` to join the WebRTC server and find other clients waiting to connect.

```javascript
channel.connect();
```

Although your app is now waiting in the MUPPET server room, you don't know that your peer-to-peer socket has been established with another app yet; that depends on the other app to negotiate a websocket with yours.

You can inspect if your channel is live and receiving events from another client with `isOpen()` or `state`:

```javascript
if (channel.isOpen()) {
  console.log('Ready to send messages over MUPPET!')
}
```

It's recommended that you set up all event listeners (see "Receive events" section below) before connecting, as events could begin to flow immediately after the MuppetChannel connects successfully, and if your event listener is not setup beforehand you may miss those events. At this time there is no replay of events.

> Note: if you or another MUPPET client attempts to send events over a channel before a receiving client is connected, the events will be temporarily held in an in-memory queue in the sender's app (will not disappear).
>
> As soon as both apps have connected to the same MuppetChannel, all of these pending events will be "replayed"--sent over the channel--so the receiver can receive them.

### Send and Receive Events

Since WebRTC itself has no rules or conventions on how data sent over channels should be organized, the [Modern UI Peer-to-Peer Events (MUPPET) protocol](https://docs.google.com/document/d/1TSvRtfzQGdclHGys9e0dLXKNnvWAmRnizH-biQW066o/view?usp=sharing) defines a consistent JSON structure for messaging, so you can effectively share your Javascript app's user events over WebRTC with another app.

#### Receive events
If you created a React `MuppetProvider` from above, you already passed `channels` to it

If you manually instantiated a new `MuppetChannel` (not using `MuppetProvider`), you have to manually wire up event listeners to callbacks using `MuppetChannel.on()`:
```javascript
channel.on('THEIR_APP.WEATHER_FIELD_CHANGED.*', (receivingChannel, evt) => {
    // the attributes inside the event are completely up to the sender;
    // ideally this structure was declared in a SCHEMAS event prior
    const { field, issueDt } = evt;
    console.log(
        `Weather field ${field} with issue ${issueDt} was selected`
    );
});
```
> Note: you will need to coordinate with the app you're integrating with to determine the eventClass constants that it plans to send you. According to MUPPET conventions, it should be declared in a `SCHEMAS` eventClass message that the other app sends you immediately after you both connect.

#### Broadcast an event
To broadcast a MUPPET event over your new MuppetChannel, simply pass your MUPPET eventClass and event to `MuppetChannel.sendEvent()`.

This can (and generally should) be invoked right in the HTML/Javascript element where the user took action. For example, the `onClick` callback of some button, or an `onSelect` of an HTML select element.

Example:
```javascript
const channel = new MuppetChannel(/* <params> */);

<button
  onClick={() => {
    channel.sendEvent({
      eventClass: 'MY_APP.PROFILE_SELECTED',
      event: {
        userId: '12345',
        userName: 'John Smith'
    }});
  }
}
>
  Select profile
</button>
```

#### Send an RPC request
To send a MUPPET event that is expected to receive some response from the receiver, call `MuppetChannel.sendRequest()`, passing the eventClass, event body, and the destination (the name of the app that should respond to the event).

This method call is intended to imitate the standard `fetch()` Javascript API, where the result can be `await()`ed until the receiving app either sends a matching MUPPET event in response, or the request times out.

Example:
```javascript
import { useState } from 'react';

const [phoneNumber, setPhoneNumber] = useState('');
// const channel = new MuppetChannel(/* <params> */);
const channel = useMuppetChannel('my-channel');

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

## Contributing

1. Ensure you have [NPM](npmjs.com) installed locally
1. Clone this repository with `git clone <repo_url>`
1. Install any 3rd-party JS libraries needed by `cd`ing into your newly-cloned repo and running `npm install`

If you have changes you wish to be incorporated into the main branch, feel free to submit your feature branch for code review! Code should run quickly, quietly (without noisy console messages), and without crashing the page of a project that imports it.

### Publishing

To publish a new version of this package:

1. In the [package.json](https://github.com/NOAA-GSL/idsse-muppet-client/blob/main/package.json) file, increase the `version` number (either the patch or minor number are usually fine).
   1. This step is needed so NPM recognizes it as a new version for any repos that install it with `npm install`. If you don't do this, NPM will reject the publish due to a conflict with the last version, and the publish GitHub Action will fail.
2. Go to the [Releases](https://github.com/NOAA-GSL/idsse-muppet-client/releases) page on the GitHub repository and click "Draft a new release"
   1. Releases should be shown in a sidebar on the right of the `Code` page on GitHub.
3. Click the "Choose a tag" dropdown, then start typing a new version number in the text box
   1. This should start with "v", then the same version that you set in the `package.json` file in step 1.
   2. Click "Create new tag"
   3. Type a bullet point or two about what was changed, or click "Generate release notes" which just links to a diff between this version and the last.
4. Make sure "Set as pre-release" is _not_ checked
   1. This will ensure that projects using this library will download your new version the next time they run `npm install`.
   1. If "pre-release" is checked, it would still publish to NPM but not upgrade by default. Users of the library would have to "opt in" to this latest version by installing it explicitly, e.g. `npm install @noaa-gsl/idsse-muppet-client@v1.2.3-beta`
5. Click "Publish release"

That's it! A GitHub Action will be kicked off to auto-publish the new version to NPM. You can watch the status [on the Actions tab of GitHub](https://github.com/NOAA-GSL/idsse-muppet-client/actions).

Once that finishes, projects that use this library can run `npm install`, and NPM will upgrade them to the new version of this library in their project (in their package.json, or by running `npm ls | grep idsse-muppet-client-client`).
