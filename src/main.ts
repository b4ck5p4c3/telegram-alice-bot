import {Telegraf} from "telegraf";
import {message} from "telegraf/filters";
import dotenv from "dotenv";
import {ProcessorRequest, ProcessorResult} from "./processor-types";

dotenv.config({
    path: ".env.local"
});
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "1337008:B4CKSP4CEB4CKSP4CEB4CKSP4CEB4CKSP4C";
const TELEGRAM_API_ROOT = process.env.TELEGRAM_API_ROOT ?? "https://api.telegram.org";
const TELEGRAM_WEBHOOK_PORT = parseInt(process.env.TELEGRAM_WEBHOOK_PORT ?? "8080")
const TELEGRAM_WEBHOOK_DOMAIN = process.env.TELEGRAM_WEBHOOK_DOMAIN;
const SWYNCA_URL = process.env.SWYNCA_URL ?? "https://swynca.bksp.in";
const SWYNCA_API_KEY = process.env.SWYNCA_API_KEY ?? "";
const ALICE_PROCESSOR_SERVICE_URL = process.env.ALICE_PROCESSOR_SERVICE_URL ?? "http://localhost:8080/process";

const bot = new Telegraf(TELEGRAM_BOT_TOKEN, {
    telegram: {
        apiRoot: TELEGRAM_API_ROOT
    }
});

type MembersResponse = {
    id: string;
    username: string;
    telegramMetadata?: {
        telegramId: string,
        telegramName?: string
    }
}[];

async function getMembers(): Promise<MembersResponse> {
    return await (await fetch(`${SWYNCA_URL}/api/members`, {
        headers: {
            authorization: `Bearer ${SWYNCA_API_KEY}`
        }
    })).json();
}

async function processRequest(request: ProcessorRequest): Promise<ProcessorResult> {
    return await (await fetch(ALICE_PROCESSOR_SERVICE_URL, {
        method: "POST",
        body: JSON.stringify(request),
        headers: {
            "content-type": "application/json"
        }
    })).json();
}

const sessionCache: Record<number, string | undefined> = {};

bot.on(message(), async (ctx) => {
    const members = await getMembers();

    const message = ctx.message;

    const telegramUserId = message.chat.id;
    if (!members.find(member => parseInt(member.telegramMetadata?.telegramId ?? "0")
        === telegramUserId)) {
        return;
    }

    if (ctx.entities().length > 0 || !ctx.text) {
        return;
    }

    const sessionId = sessionCache[telegramUserId];

    const result = await processRequest({
        sessionId,
        text: ctx.text,
        metadata: {}
    });

    if (result.requireMoreInput) {
        sessionCache[telegramUserId] = result.sessionId;
    } else {
        sessionCache[telegramUserId] = undefined;
    }

    const resultMessage = result.text + `\n\n${result.requireMoreInput ? "🟢 Dialog continues" : "🔴 Dialog ended"}`;

    ctx.sendMessage(resultMessage);
});

bot.launch(TELEGRAM_WEBHOOK_DOMAIN ? {
    webhook: {
        domain: TELEGRAM_WEBHOOK_DOMAIN,
        port: TELEGRAM_WEBHOOK_PORT,
        path: "/"
    }
} : {}).catch(e => {
    console.error(e);
});

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
