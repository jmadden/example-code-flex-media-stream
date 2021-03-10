import { Actions, Manager, TaskHelper } from '@twilio/flex-ui';
import FlexState from '../states/FlexState';
import { ReservationEvents } from '../enums';
import request from '../helpers/request';

const manager = Manager.getInstance();
const reservationListeners = new Map();

const BASE_URL = process.env.REACT_APP_SERVERLESS_BASE_URL;

manager.events.addListener('pluginsLoaded', () => {
  initialize();
});

const handleBeforeTransfer = (options) => {
  return new Promise((resolve, reject) => {
    request('stream-call', manager, options)
      .then((response) => {
        console.log('TRANSFER RESPONSE:\r\n  ', response);
        resolve(response);
      })
      .catch((error) => {
        console.error(`ERRR STREAM \r\n`, error);
        reject(error);
      });
  });
};

const callSid = (participants) => {
  const customerObj = participants.filter(
    (participant) => participant.participantType === 'customer'
  );
  return customerObj[0].callSid;
};

Actions.addListener('beforeTransferTask', async (payload) => {
  const { participants } = payload.task.conference;

  console.debug('PARTICIPANTS: ', participants);

  console.debug('CUSTOMER SID: ', callSid(participants));
  console.debug('BEFORE TRANSFER PAYLOAD: ', payload);
  const options = {
    transfer: true,
    confSid: payload.task.conference.conferenceSid,
    callSid: callSid(participants),
  };

  console.debug('TRANSFER OPTIONS', options);

  await handleBeforeTransfer(options);
});

const stopReservationListeners = (reservation) => {
  const listeners = reservationListeners.get(reservation);
  if (listeners) {
    listeners.forEach((listener) => {
      reservation.removeListener(listener.event, listener.callback);
    });
    reservationListeners.delete(reservation);
  }
};

const handleReservationAccept = async (reservation) => {
  console.debug('RESERVATION OBJ: ', reservation);
  console.log(`### handleReservationAccept ${reservation.sid}`);
  const { customer } = reservation.task.attributes.conference.participants;
  const { sid: confSid } = reservation.task.attributes.conference;
  const { sid: taskSid } = reservation.task;
  const {
    outgoing: outgoingTransfer,
    incoming: incomingTransfer,
  } = reservation.task.transfers;
  const { workerSid } = reservation;
  console.log('CONFERENCE OBJ: ', customer);
  console.debug('OUTGOING TRANSFER: ', outgoingTransfer);

  const requestOptions = {
    callSid: customer,
    confSid,
    taskSid,
    workerSid,
  };

  const startStream = (options) => {
    return new Promise((resolve, reject) => {
      request('stream-call', manager, options)
        .then((response) => {
          console.log('STREAM RESPONSE:\r\n  ', response);
          resolve(response);
        })
        .catch((error) => {
          console.error(`ERRR STREAM \r\n`, error);
          reject(error);
        });
    });
  };

  if (customer && outgoingTransfer === null && incomingTransfer === null) {
    const stream = 'A';
    const options = { ...requestOptions, stream };
    await startStream(options);
  }

  if (incomingTransfer) {
    const stream = 'B';
    const options = { ...requestOptions, stream };
    await startStream(options);
  }
};

const handleReservationWrapup = async (reservation) => {
  console.log(`handleReservationWrapup: `, reservation);
  const { sid: confSid } = reservation.task.attributes.conference;
  const { sid: taskSid } = reservation.task;
  const { workerSid } = reservation;
  const {
    customer: callSid,
  } = reservation.task.attributes.conference.participants;

  const requestOptions = {
    callSid,
    confSid,
    taskSid,
    workerSid,
  };

  const stopStream = (options) => {
    return new Promise((resolve, reject) => {
      request('stream-call', manager, options)
        .then((response) => {
          console.log('STREAM RESPONSE:\r\n  ', response);
          resolve(response);
        })
        .catch((error) => {
          console.error(`ERRR STREAM \r\n`, error);
          reject(error);
        });
    });
  };

  const wrapup = true;
  const options = { ...requestOptions, wrapup };
  console.debug('STOP MEDIA OPTIONS: ', options);
  await stopStream(options);
};

const handleReservationEnded = async (reservation, eventType) => {
  console.log(`handleReservationEnded: `, reservation);
};

const handleReservationUpdated = (event, reservation) => {
  console.debug('Event, reservation updated', event, reservation);
  switch (event) {
    case ReservationEvents.accepted: {
      handleReservationAccept(reservation);
      break;
    }
    case ReservationEvents.wrapup: {
      handleReservationWrapup(reservation);
      break;
    }
    case ReservationEvents.timeout: {
      handleReservationEnded(reservation, ReservationEvents.timeout);
      stopReservationListeners(reservation);
      break;
    }
    case ReservationEvents.completed:
    case ReservationEvents.rejected:
    case ReservationEvents.canceled:
    case ReservationEvents.rescinded: {
      handleReservationEnded(reservation);
      stopReservationListeners(reservation);
      break;
    }
    default:
    // Nothing to do here
  }
};

const initReservationListeners = (reservation) => {
  const trueReservation = reservation.addListener
    ? reservation
    : reservation.source;
  const listeners = [];
  Object.values(ReservationEvents).forEach((event) => {
    const callback = () => handleReservationUpdated(event, trueReservation);
    trueReservation.addListener(event, callback);
    listeners.push({ event, callback });
  });
  reservationListeners.set(trueReservation, listeners);
};

const handleNewReservation = (reservation) => {
  console.debug('new reservation', reservation);
  initReservationListeners(reservation);
};

const handleReservationCreated = async (reservation) => {
  handleNewReservation(reservation);
};

manager.workerClient.on('reservationCreated', handleReservationCreated);

export const initialize = () => {
  for (const reservation of FlexState.workerTasks.values()) {
    handleNewReservation(reservation);
  }
};
