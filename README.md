# Flex Plugin Example Code

This repository is not production code, but is meant to act as an example for a specific use case where the customer leg of a call can be updaed to activate multiple [Media Streams](https://www.twilio.com/docs/voice/twiml/stream) when a call is being transferred to another agent.

## Media Stream on Agent-to-Agent Transfer

The key point to understand about this scenario is that the "worker" legs of a call **CAN NOT** be updated with TwiML, doing so requires pulling the worker out of the conference call and will force the associated task into wrapping and tear down the call.

However you can safely update the "customer" leg of a call with TwiML instructions, which in turn is where we can activate a Media Steam as well as use other TwiML. However, the key to this working is updating the "customer" leg of a call using the conference API and updating the customer leg of the conference with the `endConferenceOnExit: false` flag.

### Order of Operations

1. When a customer calls into your Flex contact center you will start the media stream on the first reservation accepted event. [Code Example - handleReservationAccepted](https://github.com/jmadden/example-code-flex-media-stream/blob/main/src/listeners/index.js#L63-L107)

   - Here is the [Twilio Function code](https://github.com/jmadden/example-code-flex-media-stream/blob/main/serverless-Stream-Recording/functions/stream-call.js#L34-L70) that The Twilio Fuction code that is activated is found here

https://github.com/jmadden/example-code-flex-media-stream/blob/main/src/listeners/index.js#L15-L107
