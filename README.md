# Flex Plugin Example Code

This repository is not production code, but is meant to act as an example for a specific use case where the customer leg of a call can be updaed to activate multiple [Media Streams](https://www.twilio.com/docs/voice/twiml/stream) when a call is being transferred to another agent.

## Media Stream on Agent-to-Agent Transfer

You can safely update the "customer" leg of a call with TwiML instructions, which in turn is where we can activate a Media Steam as well as use other TwiML. However, the key to this working is updating the "customer" leg of a call using the conference API and updating the customer leg of the conference with the `endConferenceOnExit: false` flag before making any changes to the customer call with TwiML.

> ⚠️ **IMPORTANT NOTE!** - A "worker" leg of a call **CAN NOT** be updated with TwiML. Doing so requires pulling the worker out of the conference call and will force the associated task into wrapping and tear down the call.

### Code Overview

Please note these are examples. You will have to change the code to suit your specific use case; however, this code should be enough to help you understand how to start/stop Media streams on the customer leg of a conference call without the risk of disrupting the call.

In the Flex React code, the main file we're working from is the [index.js file found under /src/listeners/](https://github.com/jmadden/example-code-flex-media-stream/blob/main/src/listeners/index.js). The listeners code is being instantiated in the `StreamRecordingPlugin.js` file by using `import './listeners';`

In the Twilio Serverless Function code the main file we're working from is the [stream-call.js file found under /serverless-Streams-Recording/functions/](https://github.com/jmadden/example-code-flex-media-stream/blob/main/serverless-Stream-Recording/functions/stream-call.js). This fuctions is responsible for manipulating the customer call leg of the conference.

1. The first thing we need to take care of is removing the beep from the conference call whenever someone joins the call. This needs to happen to avoid any confusion on the call since the only way to update the customer leg of the call is to remove them from the conference and add them back in. This could make for multiple beeps which may become confusing for the agent. This will happen on a [beforeAcceptTask even in the index.js file](https://github.com/jmadden/example-code-flex-media-stream/blob/main/src/listeners/index.js#L36-L38).

2. **Starting the first Media Stream** - This will happen when the customer is connected to agent A and the [reservatoin is accepted. This happens in the index.js file](https://github.com/jmadden/example-code-flex-media-stream/blob/main/src/listeners/index.js#L68-L114). The code will POST to the `stream-call.js` Serverless Function where the [conference API will set the customers `endConfrenceOnExit` flag to false. Then, provide TwiML instructions to the customer's call that starts the media stream, sets `endConferenceOnExit` to true, and dials the customer back into the conference](https://github.com/jmadden/example-code-flex-media-stream/blob/main/serverless-Stream-Recording/functions/stream-call.js#L36-L71).

3. **Soft Transfer the customer call to agent B** - When agent A transfers the call to agent B the fist thing we have to do before the transfer is initiated is to set the customer's leg of the call to `endConferenceOnExit` to false. This is done in the [`index.js` file during the beforeTransferTask event](https://github.com/jmadden/example-code-flex-media-stream/blob/main/serverless-Stream-Recording/functions/stream-call.js#L36-L71). This in turn POSTs to the `stream-call.js` Serverless Function which uses the [conference API to change the `endConferenceOnExit` flag](https://github.com/jmadden/example-code-flex-media-stream/blob/main/serverless-Stream-Recording/functions/stream-call.js#L19-L35).

4. **Agent B accepts the Transfer** - This fires off the reservation accepted event again and the same code is used to start a new media stream coming off of the customer leg of the call. At this point we have two media streams running.

5. **Agent A disconnects from Transfer** - When agent A finally decides to disconnecd from the call our `index.js` code is now listening for a [reservation wrap up event](https://github.com/jmadden/example-code-flex-media-stream/blob/main/serverless-Stream-Recording/functions/stream-call.js#L19-L35). This code then POSTs to the `stream-call.js` Serverless Function which in turn does all of the same logic from step 2 above, but this time it is [stopping the media stream](https://github.com/jmadden/example-code-flex-media-stream/blob/main/serverless-Stream-Recording/functions/stream-call.js#L19-L35) that started when agent A connected with the customer.
