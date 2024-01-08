import { Steps } from "../types";
import { fileStorageProvider } from "../utils/storage";

export interface UserState {
  command: string;
  step: Steps;
  context: Record<string, any>;
}

function getUserStateKey(userId: string | number) {
  return `UserState: ${userId}`;
}

export function setUserState(
  userId: string | number,
  command: string,
  step: Steps,
  context: Record<string, any> = {},
) {
  fileStorageProvider.storeValue(
    getUserStateKey(userId),
    JSON.stringify({ command, step, context }),
  );
}

export function getUserState(userId: string | number): UserState | undefined {
  const maybeUserState = fileStorageProvider.readValue(getUserStateKey(userId));
  return maybeUserState ? JSON.parse(maybeUserState) : undefined;
}

export function clearUserState(userId: string | number) {
  fileStorageProvider.storeValue(getUserStateKey(userId), "");
}
