exports.handler = async (context, event, callback) => {
  let response = new Twilio.Response();

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  response.setHeaders(headers);

  const { callSid, statusCallbackURL } = event;

  console.log(
    `Call sid  Passed to start-call-recording function This : ${callSid} `
  );
  console.log(`Call Back URL : ${statusCallbackURL} `);

  var params = {
    timeout: 10,
    playBeep: false,
    maxLength: 7200, // 2hr max length
    // recordingStatusCallbackEvent: ['completed'],
    // recordingStatusCallbackMethod: 'POST',
    // recordingStatusCallback: `${statusCallbackURL}`,
    trim: 'trim-silence',
  };

  const client = context.getTwilioClient();

  client
    .calls(callSid)
    .recordings.create(params)
    .then((data) => {
      console.log(data);
      response.setBody({ Status: 'SUCCESS', CallRecordingResponse: data });
      callback(null, response);
    })
    .catch((err) => {
      console.log('Error is -', err);
      response.setBody({ Status: 'FAIL', CallRecordingResponse: err });
      callback(err, response);
    });
};
