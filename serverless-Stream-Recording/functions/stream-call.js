const JWEValidator = require('twilio-flex-token-validator').functionValidator;

exports.handler = JWEValidator(async (context, event, callback) => {
  const response = new Twilio.Response();
  const twilioClient = context.getTwilioClient();

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  response.setHeaders(headers);

  const twiml = new Twilio.twiml.VoiceResponse();

  const waitForEndConferenceOnExitUpdate = (endConferenceOnExit) => 
    new Promise((resolve, reject) => {
      // The delay to check participant is an arbitrary number of
      // milliseconds to allow Programmable Voice to process the
      // participant update request. It can be raised or lowered
      // depending on observed patterns.
      const delayToCheckParticipant = 200;
      let maxRetries = 10;
      let currentRetry = 0;
      const checkInterval = setInterval(async () => {
        try {
          const participant = await twilioClient
            .conferences(event.confSid)
            .participants(event.callSid)
            .fetch();
          
          if (currentRetry >= maxRetries) {
            clearInterval(checkInterval);
            console.log(`Max retries of ${maxRetries} exceeded`);
            return reject();
          } else if (participant.endConferenceOnExit === endConferenceOnExit) {
            console.log('endConferenceOnExit update verified');
            clearInterval(checkInterval);
            return resolve();
          } else {
            currentRetry += 1;
            console.log('endConferenceOnExit update not yet complete');
          }
        } catch (error) {
          console.error('Error fetching conference participant');
          clearInterval(checkInterval);
          return reject(error);
        }
      }, delayToCheckParticipant);
    }
  );

  if (event.transfer) {
    console.log('PREVENTING CALL FROM ENDING ON TRANSFER');
    try {
      const endConferenceOnExit = false;

      const data = await twilioClient
        .conferences(event.confSid)
        .participants(event.callSid)
        .update({ endConferenceOnExit });

      console.log(`Conference participant ${event.callSid} update successful`);
      console.log('Waiting for endConferenceOnExit to match update');

      await waitForEndConferenceOnExitUpdate(endConferenceOnExit);

      response.setBody({ Status: 'SUCCESS', ResponseData: data });
    } catch (err) {
      console.log('Error is -', err);
      response.setBody({ Status: 'FAIL', ResponseData: err });
      return callback(err, response);
    }
  } else if (event.wrapup) {
    // Stop existing stream
    const stop = twiml.stop();

    try {
      const { callSid, confSid, onHold, taskSid, workerSid } = event;
      stop.stream({ name: `Stream_${workerSid}` });

      const dial = twiml.dial();
      dial.conference({ beep: false, endConferenceOnExit: true }, taskSid);
      console.log('Stream TwiML is', twiml.toString());

      if (onHold) {
        await twilioClient
          .conferences(confSid)
          .participants(callSid)
          .update({ hold: false });
      }

      const endConferenceOnExit = false;

      await twilioClient
        .conferences(confSid)
        .participants(callSid)
        .update({ endConferenceOnExit });
      
      console.log(`Conference participant ${event.callSid} update successful`);
      console.log('Waiting for endConferenceOnExit to match update');

      await waitForEndConferenceOnExitUpdate(endConferenceOnExit);

      const data = await twilioClient
        .calls(callSid)
        .update({
          twiml: twiml.toString(),
        });

      console.log(`Call ${callSid} updated with new TwiML`);
      response.setBody({ Status: 'SUCCESS', ResponseData: data });
    } catch (err) {
      console.log('Error is -', err);
      response.setBody({ Status: 'FAIL', ResponseData: err });
      return callback(err, response);
    }
  } else {
    const { callSid, taskSid, confSid, stream, workerSid } = event;
    const url =
      stream === 'A' ? context.MEDIA_STREAM_A : context.MEDIA_STREAM_B;

    console.log('STREAM URL: ', url);

    const start = twiml.start();

    try {
      // Start new stream
      const startStream = start.stream({
        name: `Stream_${workerSid}`,
        url,
        track: 'both_tracks',
      });
      startStream.parameter({
        name: 'workerSid',
        value: workerSid
      });

      const dial = twiml.dial();
      dial.conference({ beep: false, endConferenceOnExit: true }, taskSid);
      console.log('Stream TwiML is', twiml.toString());

      const endConferenceOnExit = false;

      await twilioClient
        .conferences(confSid)
        .participants(callSid)
        .update({ endConferenceOnExit });

      console.log(`Conference participant ${event.callSid} update successful`);
      console.log('Waiting for endConferenceOnExit to match update');

      await waitForEndConferenceOnExitUpdate(endConferenceOnExit);

      const data = await twilioClient
        .calls(callSid)
        .update({
          twiml: twiml.toString(),
        });

      console.log(`Call ${callSid} updated with new TwiML`);
      response.setBody({ Status: 'SUCCESS', ResponseData: data });
    } catch (err) {
      console.log('Error is -', err);
      response.setBody({ Status: 'FAIL', ResponseData: err });
      return callback(err, response);
    }
  }

  callback(null, response);
});
