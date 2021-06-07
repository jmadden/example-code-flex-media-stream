import { Actions, Manager, TaskHelper } from '@twilio/flex-ui';
import FlexState from '../states/FlexState';
import { ReservationEvents } from '../enums';
import request from '../helpers/request';

const manager = Manager.getInstance();
const reservationListeners = new Map();
const conferenceTrackers = {};

manager.events.addListener('pluginsLoaded', () => {
  initialize();
});

const handleBeforeTransfer = (options) => {
  return new Promise((resolve, reject) => {
    console.debug('PREPARE FOR TRANSFER OPTIONS:', options);

    request('stream-call', manager, options)
      .then((response) => {
        console.log('TRANSFER RESPONSE:\r\n  ', response);
        resolve(response);
      })
      .catch((error) => {
        console.error(`ERR STREAM \r\n`, error);
        reject(error);
      });
  });
};

const startStream = (options) => {
  return new Promise((resolve, reject) => {
    console.debug('START STREAM OPTIONS:', options);

    request('stream-call', manager, options)
      .then((response) => {
        console.log('STREAM RESPONSE:\r\n  ', response);
        resolve(response);
      })
      .catch((error) => {
        console.error(`ERR STREAM \r\n`, error);
        reject(error);
      });
  });
};

const stopStream = (options) => {
  return new Promise((resolve, reject) => {
    console.debug('STOP STREAM OPTIONS:', options);

    request('stream-call', manager, options)
      .then((response) => {
        console.log('STREAM RESPONSE:\r\n  ', response);
        resolve(response);
      })
      .catch((error) => {
        console.error(`ERR STREAM \r\n`, error);
        reject(error);
      });
  });
};

Actions.addListener('beforeAcceptTask', (payload) => {
  payload.conferenceOptions.beep = false;
  payload.conferenceOptions.beepOnCustomerEntrance = false;

  const { task } = payload;

  if (TaskHelper.isOutboundCallTask(task)) {
    return;
  }

  const { conference, taskSid } = task;
  const participants = conference?.source?.children || [];
  const customer = participants.find(p => p?.value?.participant_type === 'customer' && p?.value?.status === 'joined');

  conferenceTrackers[taskSid] = { customerLastEventId: customer?.lastEventId };
});

Actions.addListener('beforeTransferTask', async (payload) => {
  if (TaskHelper.isOutboundCallTask(payload.task)) {
    return;
  }

  const { conferenceSid, participants } = payload.task.conference;

  const customer = participants.find(p => p.participantType === 'customer') || {};

  const options = {
    transfer: true,
    confSid: conferenceSid,
    callSid: customer.callSid,
  };

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
  const task = TaskHelper.getTaskByTaskSid(reservation.sid);

  if (TaskHelper.isOutboundCallTask(task)) {
    return;
  }

  const { customer } = task.attributes.conference.participants;
  const { sid: confSid } = task.attributes.conference;
  const { taskSid } = task;
  const {
    outgoingTransferObject: outgoingTransfer,
    incomingTransferObject: incomingTransfer,
  } = task;
  const { workerSid } = reservation;

  const requestOptions = {
    callSid: customer,
    confSid,
    taskSid,
    workerSid,
  };

  if (customer && outgoingTransfer === undefined && incomingTransfer === undefined) {
    const stream = 'A';
    const options = { ...requestOptions, stream };
    await startStream(options);
  }

  if (incomingTransfer) {
    const stream = 'B';
    const options = { ...requestOptions, stream };
    await startStream(options);

    const { conference } = task;
    const participants = conference?.source?.children || [];

    let intervalCustomerRejoined = setInterval(() => {
      const customer = participants.find(p => p?.value?.participant_type === 'customer' && p?.value?.status === 'joined');

      if (conferenceTrackers[taskSid].customerLastEventId < customer?.lastEventId) {
        Actions.invokeAction('HoldCall', { sid: reservation.sid });
        clearInterval(intervalCustomerRejoined);
        intervalCustomerRejoined = undefined;
      }
    }, 100);
    setTimeout(() => {
      if (intervalCustomerRejoined) {
        console.warn('StreamRecording, handleReservationAccept, Customer last event ID did not change within timeout. Not putting customer on hold.');
        clearInterval(intervalCustomerRejoined);
      }
    }, 5000);
  }
};

const handleReservationWrapup = async (reservation) => {
  console.log(`handleReservationWrapup: `, reservation);
  const task = TaskHelper.getTaskByTaskSid(reservation.sid);

  if (TaskHelper.isOutboundCallTask(task)) {
    return;
  }

  const {
    conference,
    taskSid,
    workerSid
  } = task;
  
  const { conferenceSid: confSid, liveWorkerCount, liveWorkers } = conference;

  if (liveWorkerCount === 1 && liveWorkers.some(w => w.isMyself)) {
    // My worker is the only live worker, which means the customer call
    // is ending. The stream will stop on its own, no need to continue.
    return;
  }

  const participants = conference?.participants || [];
  const customer = participants.find(p => p.participantType === 'customer') || {};
  const { callSid, onHold } = customer;

  const requestOptions = {
    callSid,
    confSid,
    taskSid,
    workerSid,
  };

  const wrapup = true;
  const options = { ...requestOptions, onHold, wrapup };

  await stopStream(options);
};

const handleReservationEnded = async (reservation, eventType) => {
  console.log(`handleReservationEnded: `, reservation);

  delete conferenceTrackers[reservation.task.sid];
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
