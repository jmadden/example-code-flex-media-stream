# Flex Plugin Example Code

This repository is not production code, but is meant to act as an example for a specific use case where the customer leg of a call can be updaed to activate multiple [Media Streams](https://www.twilio.com/docs/voice/twiml/stream) when a call is being transferred to another agent.

## Media Stream on Agent-to-Agent Transfer

However you can safely update the "customer" leg of a call with TwiML instructions, which in turn is where we can activate a Media Steam as well as use other TwiML. However, the key to this working is updating the "customer" leg of a call using the conference API and updating the customer leg of the conference with the `endConferenceOnExit: false` flag.

> ⚠️ **IMPORTANT NOTE!** A "worker" leg of a call **CAN NOT** be updated with TwiML. Doing so requires pulling the worker out of the conference call and will force the associated task into wrapping and tear down the call.
