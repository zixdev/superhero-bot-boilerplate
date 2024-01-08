import { BaseBotOptions } from "../@base";
import { fileStorageProvider } from "../../utils/storage";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import { Router } from "express";
import { VerifiedAccounts } from "../../backend/VerifiedAccounts";

export function initRouter(router: Router, options: BaseBotOptions) {
  router.route("/verified-wallet/:id").get(async (req, res, next) => {
    const storedValue = fileStorageProvider.readValue(
      `VerifyWallet: ${req.params.id}`,
    );
    if (!storedValue) {
      return res.status(404).send("Verification not found");
    }

    const verifyWallet: {
      address: string;
      senderId: string;
      chatId: string;
    } = JSON.parse(storedValue);

    await VerifiedAccounts.verifyAndAddAccount(
      verifyWallet.senderId,
      verifyWallet.address as Encoded.AccountAddress,
    );

    for (const adapter of options.chatAdapters) {
      await adapter.sendMessage(
        "Fantastic! Your wallet is now securely connected",
        verifyWallet.chatId,
      );
    }

    res.send(
      "<script>window.close();</script>Account Verified successfully created, this window can be closed.",
    );
  });

  router.route("/remove-verified-wallet/:id").get(async (req, res, next) => {
    const originalRequest = fileStorageProvider.readValue(
      `RemoveVerifiedWallet: ${req.params.id}`,
    );
    if (!originalRequest) {
      return res.status(404).send("Your original request could not found");
    }
    const verifyWallet: {
      senderId: string;
      chatId: string;
    } = JSON.parse(originalRequest);

    await VerifiedAccounts.removeVerifiedAccount(verifyWallet.senderId);

    for (const adapter of options.chatAdapters) {
      await adapter.sendMessage(
        "Farewell, my friend! Your wallet is now safely disconnected. If you ever need to reconnect, you know where to find me. Until next time!",
        verifyWallet.chatId,
      );
    }

    res.send(
      "<script>window.close();</script>Account Verification successfully removed, this window can be closed.",
    );
  });

  router.route("/send/:id").get(async (req, res, next) => {
    const storedValue = fileStorageProvider.readValue(`Send: ${req.params.id}`);
    if (!storedValue) {
      return res.status(404).send("Send not found");
    }
    const { chatId } = JSON.parse(storedValue);

    for (const adapter of options.chatAdapters) {
      await adapter.sendMessage("✅Perfect! Transfer completed!", chatId);
    }

    res.send(
      "<script>window.close();</script>Account Verified successfully created, this window can be closed.",
    );
  });

  router.route("/get-verified-accounts").post(async (req, res, next) => {
    const filterAccounts = (req.body?.filterAccounts as string[]) || [];
    res.json(VerifiedAccounts.getVerifiedAccounts(filterAccounts));
  });
}
