const request = async (path, manager, params) => {
  const body = {
    ...params,
    Token: manager.store.getState().flex.session.ssoTokenPayload.token,
  };

  const options = {
    method: 'POST',
    mode: 'no-cors',
    body: new URLSearchParams(body),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  };

  const REACT_APP_SERVERLESS_BASE_URL =
    process.env.REACT_APP_SERVERLESS_BASE_URL;
  //const REACT_APP_SERVICE_BASE_URL = "https://serverless-7697-dev.twil.io";
  console.debug(`${REACT_APP_SERVERLESS_BASE_URL}/${path}`);

  const resp = await fetch(`${REACT_APP_SERVERLESS_BASE_URL}/${path}`, options);
  const contentType = resp.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return await resp.json();
  } else {
    return await resp.text();
  }
};

export default request;
