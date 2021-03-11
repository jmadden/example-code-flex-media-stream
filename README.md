# Flex Plugin Example Code

This repository is not production code, but is meant to act as an example for a specific use case where the customer leg of a call can be updaed to activate multiple [Media Streams](https://www.twilio.com/docs/voice/twiml/stream) when a call is being transferred to another agent.

## Media Stream on Agent-to-Agent Transfer

You can safely update the "customer" leg of a call with TwiML instructions, which in turn is where we can activate a Media Steam as well as use other TwiML. However, the key to this working is updating the "customer" leg of a call using the conference API and updating the customer leg of the conference with the `endConferenceOnExit: false` flag before making any changes to the customer call with TwiML.

> ⚠️ **IMPORTANT NOTE!** - A "worker" leg of a call **CAN NOT** be updated with TwiML. Doing so requires pulling the worker out of the conference call and will force the associated task into wrapping and tear down the call.

### Code Overview

Please note these are examples. You will have to change the code to suite your specific use case; however, this code should be enough to help you understand how to start/stop Media streams on the customer leg of a conference call without the risk of disrupting the call.

In the Flex React code, the main file we're working from is the [index.js file found under /src/listeners](https://github.com/jmadden/example-code-flex-media-stream/blob/main/src/listeners/index.js). The listeners code is being instantiated in the `StreamRecordingPlugin.js` file by `import './listeners';`
