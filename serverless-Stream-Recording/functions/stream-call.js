exports.handler = async (context, event, callback) => {
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

  const stop = twiml.stop();
  const start = twiml.start();

  if (event.transfer) {
    console.log('PREVENTING CALL FROM ENDING ON TRANSFER');
    try {
      twilioClient
        .conferences(event.confSid)
        .participants(event.callSid)
        .update({ endConferenceOnExit: false })
        .then((data) => {
          response.setBody({ Status: 'SUCCESS', ResponseData: data });
          callback(null, response);
        });
    } catch (err) {
      console.log('Error is -', err);
      response.setBody({ Status: 'FAIL', ResponseData: err });
      callback(err, response);
    }
  } else {
    const { callSid, taskSid, confSid, stream, workerSid } = event;
    const url =
      stream === 'A' ? context.MEDIA_STREAM_A : context.MEDIA_STREAM_B;

    console.log('STREAM URL: ', url);

    try {
      // Start new stream
      const startStream = start.stream({
        name: `Stream_${workerSid}`,
        url,
        track: 'both_tracks',
      });

      const dial = twiml.dial();
      dial.conference({ endConferenceOnExit: true }, taskSid);
      console.log('Stream TwiML is', twiml.toString());

      twilioClient
        .conferences(confSid)
        .participants(callSid)
        .update({ endConferenceOnExit: false })
        .then((participant) => {
          return twilioClient.calls(callSid).update({
            twiml: twiml.toString(),
          });
        })
        .then((data) => {
          response.setBody({ Status: 'SUCCESS', ResponseData: data });
          callback(null, response);
        });
    } catch (err) {
      console.log('Error is -', err);
      response.setBody({ Status: 'FAIL', ResponseData: err });
      callback(err, response);
    }
  }

  if (event.wrapup) {
    // Stop existing stream
    try {
      const { callSid, confSid, taskSid, workerSid } = event;
      const stopStream = stop.stream({ name: `Stream_${workerSid}` });
      const dial = twiml.dial();
      dial.conference({ endConferenceOnExit: true, beep: false }, taskSid);
      console.log('Stream TwiML is', twiml.toString());

      twilioClient
        .conferences(confSid)
        .participants(callSid)
        .update({ endConferenceOnExit: false })
        .then((participant) => {
          return twilioClient.calls(callSid).update({
            twiml: twiml.toString(),
          });
        })
        .then((data) => {
          response.setBody({ Status: 'SUCCESS', ResponseData: data });
          callback(null, response);
        });
    } catch (err) {
      console.log('Error is -', err);
      response.setBody({ Status: 'FAIL', ResponseData: err });
      callback(err, response);
    }
  }
};
