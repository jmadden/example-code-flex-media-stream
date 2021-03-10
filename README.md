# Flex Plugin Example Code

This repository is not production code, but is meant to act as an example for a specific use case where the customer leg of a call can be updaed to activate multiple [Media Streams](https://www.twilio.com/docs/voice/twiml/stream) when a call is being transferred to another agent.

## Media Stream on Agent-to-Agent Transfer

The key point to understand about this scenario is that the agent legs of a call **CAN NOT** be updated with TwiML, doing so will force the associated task into wrapping and tear down the call.
