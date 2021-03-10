exports.handler = async (context, event, callback) => {
  let response = new Twilio.Response();

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  response.setHeaders(headers);

  const { callSid, recordingSid } = event;

  console.log(
    `stop-call-recording function CallSid : ${callSid} , recordingSid : ${recordingSid} `
  );

  const client = context.getTwilioClient();

  client
    .calls(callSid)
    .recordings(recordingSid)
    .update({ status: 'stopped' })
    .then((data) => {
      console.log(data);
      response.setBody({ Status: 'SUCCESS', StopCallRecordingResponse: data });
      callback(null, response);
    })
    .catch((err) => {
      console.log('Error is -', err);
      response.setBody({ Status: 'FAIL', StopCallRecordingResponse: err });
      callback(err, response);
    });
};
