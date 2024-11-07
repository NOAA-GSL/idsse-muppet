# Developer Guide - Vanilla JS

Although it's not recommended for apps written in React, you can create a MuppetChannel instance manually outside of any React context. All of this is happening under the hood of the React `MuppetProvider` and Hooks like `useMuppetCallback`.

Example:
```javascript
const channel = new MuppetChannel({
    clientName: "MY_APP",
    room: "some-room-on-the-server",
    serverUrl: "http://example.com",
    serverPath: "/",
});
```

Once you instantiated a new `MuppetChannel`, you can use this channel connection to wire up event listeners to run callbacks when your channel receives a specific eventClass, using `MuppetChannel.on()`.

Example:
```javascript
channel.on("THEIR_APP.WEATHER_FIELD_CHANGED", (receivingChannel, evt) => {
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
  console.log("Ready to send messages over MUPPET!")
}
```

It's recommended that you set up all event listeners (`on()`) before connecting, as events could begin to flow immediately after the MuppetChannel connects successfully, and if your event listener is not setup beforehand you may miss those events. At this time there is no replay of events.
