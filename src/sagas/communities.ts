import { call, put, select, take } from "redux-saga/effects";
import { commands, Uri, window } from "vscode";
import { LiveShare } from "vsls";
import * as api from "../api";
import { createWebSocketChannel } from "../channels/webSocket";
import { ChatApi } from "../chatApi";
import { config } from "../config";
import { LocalStorage } from "../storage/LocalStorage";
import {
  joinCommunityCompleted,
  leaveCommunityCompleted,
  loadCommunitiesCompleted,
  muteAllCommunities,
  muteCommunity,
  updateCommunity
} from "../store/actions";
import { ICommunity, IMember, ISession } from "../store/model";
import { sessionTypeDisplayName } from "../utils";

function isCommunityMuted(name: string) {
  return (
    (config.mutedCommunities.includes("*") &&
      !config.mutedCommunities.includes(`!${name}`)) ||
    (!config.mutedCommunities.includes("*") &&
      config.mutedCommunities.includes(name))
  );
}

export function* loadCommunitiesSaga(
  storage: LocalStorage,
  vslsApi: LiveShare,
  chatApi: ChatApi
) {
  const communityNames: string[] = storage.getCommunities();

  let response: ICommunity[] = [];
  if (communityNames.length > 0) {
    response = yield call(api.loadCommunities, communityNames);
  }

  for (let community of response) {
    community.isMuted = isCommunityMuted(community.name);
  }

  yield put(loadCommunitiesCompleted(response));

  const channel = createWebSocketChannel(vslsApi, chatApi);

  while (true) {
    const { name, members, sessions } = yield take(channel);
    yield put(<any>updateCommunity(name, members, sessions));
  }
}

export function* joinCommunity(
  storage: LocalStorage,
  vslsApi: LiveShare,
  chatApi: ChatApi,
  { name }: any
) {
  const userInfo = vslsApi.session.user!;

  storage.joinCommunity(name);

  const { members, sessions } = yield call(
    api.joinCommunity,
    name,
    userInfo.displayName,
    userInfo.emailAddress!
  );

  const isMuted = isCommunityMuted(name);
  yield put(joinCommunityCompleted(name, members, sessions, isMuted));

  chatApi.onCommunityJoined(name);
}

export function* leaveCommunity(
  storage: LocalStorage,
  vslsApi: LiveShare,
  { name }: any
) {
  storage.leaveCommunity(name);

  yield call(
    api.leaveCommunity,
    name,
    vslsApi.session.user!.displayName,
    vslsApi.session.user!.emailAddress!
  );
  yield put(leaveCommunityCompleted(name));
}

export function* updateCommunitySaga(
  vslsApi: LiveShare,
  { name, members, sessions: newSessions }: any
) {
  const communities = yield select(s => s.communities);
  const { helpRequests, broadcasts, codeReviews, isMuted } = communities.find(
    (c: any) => c.name === name
  );

  yield put(joinCommunityCompleted(name, members, newSessions, isMuted));

  if (isCommunityMuted(name)) {
    return;
  }

  const currentSessions = [...helpRequests, ...broadcasts, ...codeReviews];
  const filteredSessions = newSessions.filter(
    (newSession: ISession) =>
      !currentSessions.find(
        (currentSession: ISession) => newSession.id === currentSession.id
      )
  ) as ISession[];

  for (let s of filteredSessions) {
    if (s.host === vslsApi.session.user!.emailAddress!) {
      continue;
    }

    const { name: host } = members.find((m: IMember) => m.email === s.host);
    const message = `${host} started a ${sessionTypeDisplayName(
      s.type
    )} in ${name}: ${s.description}`;

    const muteCommunityLabel = `Mute ${name}`;
    const response = yield call(
      // @ts-ignore
      window.showInformationMessage,
      message,
      muteCommunityLabel,
      "Mute All",
      "Join"
    );

    if (response === "Join") {
      vslsApi.join(Uri.parse(s.url));
    } else if (response === "Mute All") {
      yield put(muteAllCommunities());
    } else if (response === muteCommunityLabel) {
      yield put(muteCommunity(name));
    }
  }
}

export function* clearMessagesSaga(chatApi: ChatApi, { payload }: any) {
  yield call(api.clearMessages, payload);
  yield call(chatApi.onMessagesCleared.bind(chatApi), payload);
}

export function muteCommunitySaga({ payload }: any) {
  if (config.mutedCommunities.includes("*")) {
    config.mutedCommunities = config.mutedCommunities.filter(
      c => c !== `!${payload}`
    );
  } else {
    config.mutedCommunities = [...config.mutedCommunities, payload];
  }
}

export function unmuteCommunitySaga({ payload }: any) {
  if (config.mutedCommunities.includes("*")) {
    config.mutedCommunities = [...config.mutedCommunities, `!${payload}`];
  } else {
    config.mutedCommunities = config.mutedCommunities.filter(
      c => c !== payload
    );
  }
}

export function muteAllCommunitiesSaga() {
  config.mutedCommunities = ["*"];

  commands.executeCommand(
    "setContext",
    "communities:allCommunitiesMuted",
    true
  );
}

export function unmuteAllCommunitiesSaga() {
  config.mutedCommunities = [];

  commands.executeCommand(
    "setContext",
    "communities:allCommunitiesMuted",
    false
  );
}
