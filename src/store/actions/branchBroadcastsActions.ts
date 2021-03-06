import { Access } from "vsls";
import { store } from "../../store";
import { IBranchBroadcastRecord, IStore } from "../model";

export const BROADCAST_BRANCH_FETCH_DATA = "BROADCAST_BRANCH_FETCH_DATA";
export const BROADCAST_BRANCH_ADD_BRANCH = "BROADCAST_BRANCH_ADD_BRANCH";
export const BROADCAST_BRANCH_REMOVE_BRANCH = "BROADCAST_BRANCH_REMOVE_BRANCH";
export const BROADCAST_BRANCH_SET_EXPLICITLY_STOPPED =
  "BROADCAST_BRANCH_SET_EXPLICITLY_STOPPED";

export const BROADCAST_BRANCH_REMOVE_ALL_BROADCASTS =
  "BROADCAST_BRANCH_REMOVE_ALL_BROADCASTS";

function action<T, R>(type: T, payload: R): { type: T; payload: R } {
  return { type, payload };
}

export const setBranchBroadcastDataAction = (
  broadcastBranches: IBranchBroadcastRecord[]
) => {
  const payload = { broadcastBranches };

  return action<typeof BROADCAST_BRANCH_FETCH_DATA, typeof payload>(
    BROADCAST_BRANCH_FETCH_DATA,
    payload
  );
};

export const addBranchBroadcastAction = (
  branchName: string,
  spaceName: string,
  description: string,
  access: Access
) => {
  const payload = { branchName, spaceName, description, access };

  return action<typeof BROADCAST_BRANCH_ADD_BRANCH, typeof payload>(
    BROADCAST_BRANCH_ADD_BRANCH,
    payload
  );
};

export const removeBranchBroadcastAction = (branchName: string) => {
  const payload = { branchName };

  return action<typeof BROADCAST_BRANCH_REMOVE_BRANCH, typeof payload>(
    BROADCAST_BRANCH_REMOVE_BRANCH,
    payload
  );
};

export const setBranchBroadcastExplicitlyStoppedAction = (
  branchName: string,
  isExplicitlyStopped: boolean
) => {
  const payload = { branchName, isExplicitlyStopped };

  return action<typeof BROADCAST_BRANCH_SET_EXPLICITLY_STOPPED, typeof payload>(
    BROADCAST_BRANCH_SET_EXPLICITLY_STOPPED,
    payload
  );
};

export const removeAllBranchBroadcastsAction = () => {
  const payload = undefined;

  return action<typeof BROADCAST_BRANCH_REMOVE_ALL_BROADCASTS, typeof payload>(
    BROADCAST_BRANCH_REMOVE_ALL_BROADCASTS,
    payload
  );
};

export type AcceptedBranchBroadcastActions =
  | ReturnType<typeof setBranchBroadcastDataAction>
  | ReturnType<typeof addBranchBroadcastAction>
  | ReturnType<typeof removeBranchBroadcastAction>
  | ReturnType<typeof setBranchBroadcastExplicitlyStoppedAction>
  | ReturnType<typeof removeAllBranchBroadcastsAction>;

interface IAddBranchBroadcastOptions {
  branchName: string;
  spaceName: string;
  description: string;
  access: Access;
}

export const addBranchBroadcast = (options: IAddBranchBroadcastOptions) => {
  const { branchName, spaceName, description, access } = options;

  store.dispatch(
    addBranchBroadcastAction(branchName, spaceName, description, access)
  );
};

export const removeBranchBroadcast = (branchName: string) => {
  store.dispatch(removeBranchBroadcastAction(branchName));
};

export const setBranchBroadcastExplicitlyStopped = (
  branchName: string,
  isExplicitlyStopped: boolean
) => {
  store.dispatch(
    setBranchBroadcastExplicitlyStoppedAction(branchName, isExplicitlyStopped)
  );
};

export const getBranchBroadcast = (
  branchName: string
): IBranchBroadcastRecord | undefined => {
  const state = store.getState() as IStore;
  const { broadcastBranches } = state;
  const { broadcasts } = broadcastBranches;

  const result = broadcasts.find(broadcast => {
    return broadcast.branchName === branchName;
  });

  return result;
};

export const getBranchBroadcasts = (): IBranchBroadcastRecord[] => {
  const state = store.getState() as IStore;
  const { broadcastBranches } = state;
  const { broadcasts } = broadcastBranches;

  const result = [...broadcasts];

  return result;
};

export const removeAllBranchBroadcasts = () => {
  store.dispatch(removeAllBranchBroadcastsAction());
};
