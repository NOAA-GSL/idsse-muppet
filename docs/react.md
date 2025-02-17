# Developer Guide - React

## Table of Contents

- [Developer Guide - React](#developer-guide---react)
  - [Table of Contents](#table-of-contents)
  - [`MuppetProvider`](#muppetprovider)
  - [Hooks](#hooks)
    - [`useMuppetChannel`](#usemuppetchannel)
    - [`useMuppetChannels`](#usemuppetchannels)
    - [`useMuppetCallback`](#usemuppetcallback)
  - [`MuppetChannel`](#muppetchannel)
    - [`sendEvent()`](#sendevent)
    - [`sendRequest()`](#sendrequest)
    - [`sendRawEvent()`](#sendrawevent)

## `MuppetProvider`

In the `main.jsx` file of your React app, add a `<MuppetProvider>` component wrapping your top-level React app component (typically called "App"). Pass the Provider a string array `channelNames`, which is a list of WebRTC rooms on the server you wish to connect to.

```javascript
// main.jsx
import ReactDOM from "react-dom/client";
import { MuppetProvider } from "@noaa-gsl/idsse-muppet";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <MuppetProvider
    clientName="MY_APP"
    serverUrl="http://example.com" // URL of WebRTC signaling server
    serverPath="/"
    channelNames={["my-channel"]}
  >
    <App>
  </MuppetProvider>
);
```

These channel name(s) and clientName should be coordinated beforehand with the other web apps you wish to communicate via MUPPET; your app and the other app must connect to the same channel on the server for the apps to "find each other" (negotiate a peer-to-peer websocket) and start sending messages. The `clientName` is important because the other app may wish to subscribe to events published by you (which will start with your `clientName`). You can pass any number of `channelNames` to the Provider, which will attempt to create individual connections to each channel listed.

This Provider stores an app-wide [React Context](https://react.dev/learn/passing-data-deeply-with-context) for you, so any components in your component tree can reuse the same persistant `MuppetChannel` by calling the [useMuppetChannel()](#usemuppetchannel) React hook with one of the channel names.

> For reliability, it's recommended that this room is unique to your session/browser ("my-room-abc123", for example, instead of just "my-room"). Consider establishing with the app with which you're integrating some shared nonce or algorithm to generate a new room for each new user session, so user A using your app will not have problems with user B's click actions taking effect in their session.
>
> If you're using the React approach, `MuppetProvider` handles this for you by generating a "fingerprint" unique to this browser user and prepending it to the WebRTC room you passed before attempting to connect, e.g. `4zd9jp:some-room-on-the-server`. Other apps running on this browser that use this library will generate the same nonce, and so find each other on the WebRTC signaling server.

TODO: decide on some algorithm or method to share WebRTC room names before connection.

TODO: security recommendations

Although your app is now waiting in the MUPPET server room, you don't know that your peer-to-peer socket has been established with another app yet; that depends on the other app to negotiate a websocket with yours.

You can inspect if your channel is live and receiving events from another client with `isOpen()` or `state`:

```javascript
if (channel.isOpen()) {
  console.log('Ready to send messages over MUPPET!');
}
```

> Note: if you or another MUPPET client attempts to send events over a channel before a receiving client is connected, the events will be temporarily held in an in-memory queue in the sender's app (will not disappear).
>
> As soon as both apps have connected to the same MuppetChannel, all of these pending events will be "replayed"--sent over the channel--so the receiver can receive them. Any queued messages with the same `destination` and `eventClass` will be de-duplicated--using only the latest one--to avoid jittery behavior in the receiver when it comes online.

## Hooks

### `useMuppetChannel`

Assuming you created a React `MuppetProvider` from above and passed `channelNames` to it, the Provider stores and exposes to any component in your React app tree the `MuppetChannel` instances for those channel names.

```javascript
// MyComponent.jsx
import { useEffect } from 'react';
import { useMuppetChannel } from '@noaa-gsl/idsse-muppet';

function MyComponent() {
  const channel = useMuppetChannel('my-channel');

  useEffect(() => {
    console.log('Got MUPPET channel, current status:', channel?.state);
  }, [channel]);
}
```

Note the component must know the "channel name" string given to `MuppetProvider`, so it can reference the `MuppetChannel` object it wants to use, as multiple channels can be stored in MuppetProvider Context. In the example above, the exact channel name is `my-channel`, but if a non-existent channel was requested by the component, the `useMuppetChannel()` hook would return `undefined`.

### `useMuppetChannels`

You can also get the mapping of all channel names to their `MuppetChannel` instances by calling `useMuppetChannels()`. Remember, these channel names will match exactly the strings passed to `MuppetProvider`, and may be null if they haven't attempted to connect yet.

For example, if you passed `channelNames={["some-channel", "another-channel"]}` to the overall `MuppetProvider`:

```javascript
const channelMap = useMuppetChannels();
const { 'some-channel': someChannel, 'another-channel': anotherChannel } = channelMap;

console.log('Is some-channel open?', someChannel.isOpen());

anotherChannel?.sendEvent({
  eventClass: 'MY_APP.COLOR_SELECTED',
  event: { color: 'blue' },
});
```

### `useMuppetCallback`

Assuming you created a React `MuppetProvider` from above and passed `channelNames` to it, the Provider stores and exposes to any component in your React app tree the `MuppetChannel` instances for those channel names.

Use the Hook `useMuppetCallback` similar to how you might wire up a callback function to a given React state change using [useEffect()](https://react.dev/reference/react/hooks#effect-hooks).

```javascript
// MyComponent.jsx
import { useMuppetCallback } from "@noaa-gsl/idsse-muppet";

function MyComponent () {
  const [currentColor, setCurrentColor] = useState(null);

  useMuppetCallback("my-channel", (channel, msg) => {
    console.log("User picked a new color in OTHER_APP": msg);
    setCurrentColor(msg.event.color)
  }, ["OTHER_APP.COLOR_SELECTED.*"]);

  return (
    <div>
    <p>Your favorite color:</p>
    <p>{currentColor}
    </div>
  );
}
```

This example `useMuppetCallback` expects another MUPPET client (identified by the app name "OTHER_APP") to connect to a MUPPET channel/room named "my-channel" and send our app messages of `eventClass` `OTHER_APP.COLOR_SELECTED`, with a payload structured like `{ "color": "green" }`.

Since WebRTC itself has no rules or conventions on how data sent over channels should be organized, the [Modern UI Peer-to-Peer Events (MUPPET) protocol](https://docs.google.com/document/d/1TSvRtfzQGdclHGys9e0dLXKNnvWAmRnizH-biQW066o/view?usp=sharing) defines a consistent JSON structure for messaging, so you can effectively share your Javascript app's user events over WebRTC with another app.

> Note: you will need to coordinate with the app you're integrating with to determine the eventClass constants that it plans to send you. According to MUPPET conventions, it should be declared in JSON Schema the body of a special `SCHEMAS` eventClass message that the other app sends you immediately after you both connect.

## `MuppetChannel`

### `sendEvent()`

To broadcast a MUPPET event over your new MuppetChannel, simply pass your MUPPET eventClass and event to `MuppetChannel.sendEvent()`.

This can (and generally should) be invoked right in the Javascript component where the user took action. For example, the `onClick` callback of some button, or an `onSelect` of an HTML select element:

```javascript
// MyComponent.jsx
import { useMuppetChannel } from '@noaa-gsl/idsse-muppet';

function MyComponent() {
  const channel = useMuppetChannel('my-channel');

  const onButtonClick = () => {
    channel?.sendEvent({
      eventClass: 'SOME_EVENT',
      event: { value: 123 },
    });
  };

  return <button onClick={onButtonClick}>Hello world</button>;
}

export default MyComponent;
```

### `sendRequest()`

To send a MUPPET event that is expected to receive some response from the receiver, call `MuppetChannel.sendRequest()`, passing the eventClass, event body, and the destination (the name of the app that should respond to the event).

This method call is intended to imitate the standard `fetch()` Javascript API, where the result can be `await()`ed until the receiving app either sends a matching MUPPET event in response, or the request times out.

Example:

```javascript
// MyComponent.jsx
import { useState } from 'react';

function MyComponent() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const channel = useMuppetChannel('my-channel');

  const onLookupPhoneClick = async () => {
    try {
      const res = await channel.sendRequest({
        eventClass: 'MY_APP.GET_USER_PHONE',
        event: { userId: 'abc-123' },
        destination: 'THEIR_APP',
      });
      setPhoneNumber(res.event.phoneNumber);
    } catch (err) {
      console.warning('Failed to get phone number from THEIR_APP');
      setPhoneNumber('ERR');
    }
  };

  return (
    <div>
      <button onClick={onLookupPhoneClick}>Lookup phone number</button>

      <p>User phone number:</p>
      <p>{phoneNumber}</p>
    </div>
  );
}
```

Under the hood, this is sending a MUPPET event to the app "THEIR_APP" with an event class "MY_APP.GET_USER_PHONE", which the receiver should respond to by sending a MUPPET event back with class "THEIR_APP.GET_USER_PHONE" and destination: "MY_APP". The MUPPET library then resolves your awaited promise with the response payload.

### `sendRawEvent()`

This function should be avoided as much as possible, using `sendEvent()` instead, which will take the `event` you pass it and, using helpful defaults, transform it to a MUPPET protocol-compliant format that is understood by receiving apps (provide a UUID, build a lower-level eventClass that combines your clientName, eventClass, and the intended destination app, etc.)

If you need to bypass these MUPPET conventions, you can send a custom JSON object down the MUPPET channel. Be aware that it's not guaranteed to be parsed, interpreted, and acted upon as expected by the receiving app.

```javascript
const channel = useMuppetChannel('my-channel');
channel?.sendRawEvent({
  id: '123456',
  destination: 'OTHER_APP',
  eventClass: 'CUSTOM_SENDER_APP.BUTTON_CLICKED',
  event: { foo: 'bar' },
});
```
