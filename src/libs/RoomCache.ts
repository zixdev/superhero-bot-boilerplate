import { fileStorageProvider } from "../utils/storage";

export interface IRoomMetadata {
  isDirect: boolean;
  roomName?: string;
}

export interface IMDirect {
  content: {
    [userId: string]: string[];
  };
  type: "m.direct";
}

function getRoomMetadataCacheKey(userId: string | number): string {
  return `Room: ${userId}`;
}

export function setRoomMetadata(
  roomId: string,
  roomMetaData: IRoomMetadata,
): void {
  fileStorageProvider.storeValue(
    getRoomMetadataCacheKey(roomId),
    JSON.stringify(roomMetaData),
  );
}

export function getRoomMetadata(roomId: string): IRoomMetadata | undefined {
  const storedRoomMetadata = fileStorageProvider.readValue(
    getRoomMetadataCacheKey(roomId),
  );
  return storedRoomMetadata ? JSON.parse(storedRoomMetadata) : undefined;
}
