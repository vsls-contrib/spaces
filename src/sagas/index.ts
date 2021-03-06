import {
  all,
  fork,
  put,
  take,
  takeEvery,
  takeLatest
} from "redux-saga/effects";
import * as vsls from "vsls";
import { createAuthenticationChannel } from "../channels/authentication";
import { ISessionStateChannel } from "../channels/sessionState";
import { ChatApi } from "../chatApi";
import { config } from "../config";
import { ReadmeFileSystemProvider } from "../readmeFileSystemProvider";
import { LocalStorage } from "../storage/LocalStorage";
import {
  ACTION_CLEAR_ZOMBIE_SESSIONS,
  ACTION_CREATE_SESSION,
  ACTION_JOIN_SPACE,
  ACTION_LEAVE_SPACE,
  ACTION_LOAD_SPACES,
  ACTION_SPACE_UPDATED,
  blockMember,
  clearMessages,
  clearZombieSessions,
  demoteToMember,
  loadSpaces,
  makeSpacePrivate,
  makeSpacePublic,
  muteAllSpaces,
  muteSpace,
  promoteToFounder,
  unblockMember,
  unmuteAllSpaces,
  unmuteSpace,
  updateReadme,
  userAuthenticationChanged
} from "../store/actions";
import { rebuildContacts, REBUILD_CONTACTS_ACTIONS } from "./contacts";
import { extensionsSaga } from "./extensions";
import {
  cleanZombieSession,
  createSession,
  endActiveSession
} from "./sessions";
import {
  blockMemberSaga,
  clearMessagesSaga,
  demoteToMemberSaga,
  joinSpaceSaga,
  leaveSpaceSaga,
  loadSpacesSaga,
  makeSpacePrivateSaga,
  makeSpacePublicSaga,
  muteAllSpacesSaga,
  muteSpaceSaga,
  promoteToFounderSaga,
  unblockMemberSaga,
  unmuteAllSpacesSaga,
  unmuteSpaceSaga,
  updateReadmeSaga,
  updateSpaceSaga
} from "./spaces";
import { workspaceSaga } from "./workspace";

function* workerSagas(
  storage: LocalStorage,
  vslsApi: vsls.LiveShare,
  chatApi: ChatApi,
  sessionStateChannel: ISessionStateChannel,
  fileSystemProvider: ReadmeFileSystemProvider
) {
  yield all([
    takeEvery(
      ACTION_JOIN_SPACE,
      joinSpaceSaga.bind(null, storage, vslsApi, chatApi)
    ),
    takeEvery(ACTION_LEAVE_SPACE, leaveSpaceSaga.bind(null, storage, vslsApi)),
    takeEvery(
      ACTION_SPACE_UPDATED,
      updateSpaceSaga.bind(null, vslsApi, fileSystemProvider)
    ),
    takeEvery(clearMessages, clearMessagesSaga.bind(null, chatApi)),

    takeEvery(
      ACTION_CREATE_SESSION,
      createSession.bind(null, storage, vslsApi)
    ),
    takeEvery(sessionStateChannel, endActiveSession.bind(null, storage)),
    takeEvery(
      ACTION_CLEAR_ZOMBIE_SESSIONS,
      cleanZombieSession.bind(null, storage)
    ),

    takeEvery(muteSpace, muteSpaceSaga),
    takeEvery(unmuteSpace, unmuteSpaceSaga),

    takeEvery(muteAllSpaces, muteAllSpacesSaga),
    takeEvery(unmuteAllSpaces, unmuteAllSpacesSaga),

    takeEvery(makeSpacePrivate, makeSpacePrivateSaga),
    takeEvery(makeSpacePublic, makeSpacePublicSaga),
    takeEvery(updateReadme, updateReadmeSaga),

    takeEvery(promoteToFounder, promoteToFounderSaga),
    takeEvery(demoteToMember, demoteToMemberSaga),
    takeEvery(blockMember, blockMemberSaga),
    takeEvery(unblockMember, unblockMemberSaga),

    takeLatest(
      ACTION_LOAD_SPACES,
      loadSpacesSaga.bind(null, storage, vslsApi, chatApi)
    ),
    takeLatest(REBUILD_CONTACTS_ACTIONS, rebuildContacts.bind(null, vslsApi))
  ]);
}

export function* rootSaga(
  storage: LocalStorage,
  vslsApi: vsls.LiveShare,
  chatApi: ChatApi,
  sessionStateChannel: ISessionStateChannel,
  fileSystemProvider: ReadmeFileSystemProvider
) {
  const authChannel = createAuthenticationChannel(vslsApi, chatApi);
  let tasks = [];
  while (true) {
    const isSignedIn = yield take(authChannel);
    yield put(userAuthenticationChanged(isSignedIn));

    if (isSignedIn) {
      tasks.push(
        yield fork(
          workerSagas,
          storage,
          vslsApi,
          chatApi,
          sessionStateChannel,
          fileSystemProvider
        )
      );

      if (config.mutedSpaces.includes("*")) {
        yield put(muteAllSpaces());
      }

      yield put(<any>loadSpaces());

      yield put(<any>clearZombieSessions());

      tasks.push(yield fork(workspaceSaga, storage));
      tasks.push(yield fork(extensionsSaga, storage));
    } else {
      tasks.forEach(task => task.cancel());
      tasks = [];
    }
  }
}
