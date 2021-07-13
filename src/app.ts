// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const { version: BOT_VERSION } = require('../package.json');

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
process.env.BOT_VERSION = BOT_VERSION as string;

import fs from 'fs';
import path from 'path';

if (!fs.existsSync(path.join(__dirname, '../node_modules'))) {
    /* eslint-disable-next-line no-console */
    console.error('Missing dependencies! Install them by running `npm install`');
    process.exit(1);
}

import pjson from 'pjson';

if (process.env.BOT_VERSION !== pjson.version) {
    /* eslint-disable-next-line no-console */
    console.error('You have a newer version on disk! Compile the code by running `npm run build`');
    process.exit(1);
}

import genPaths from './resources/paths';

const filesPath = genPaths().files.giveawayData;

if (!fs.existsSync(path.dirname(filesPath))) {
    fs.mkdirSync(path.dirname(filesPath), { recursive: true });
    fs.writeFileSync(filesPath, JSON.stringify([]), { encoding: 'utf8' });
}

import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { GiveawaysManager } from 'discord-giveaways';

import { Client, Collection, GuildMember, MessageReaction } from 'discord.js';
const client = new Client() as ClientGiveaway;

import ms from 'ms';

// Init discord giveaways
client.giveawaysManager = new GiveawaysManager(client, {
    storage: './files/giveaways.json',
    updateCountdownEvery: (ms(process.env.UPDATE_COUNTDOWN_EVERY) as number) || 5 * 1000,
    default: {
        botsCanWin: false,
        embedColor: process.env.EMBED_COLOR || '#FF0000',
        reaction: '🎉'
    }
});

import log, { init } from './lib/logger';
init(genPaths());

const giveawayOnlyJoinableRoleIDs = JSON.parse(process.env.GIVEAWAY_ONLY_JOINABLE_ROLE_IDS) as string[];
const referenceMessageURL = process.env.GIVEAWAY_INFO_ABOUT_JOINABLE_MESSAGE_URL;

client.giveawaysManager.on('giveawayReactionAdded', (giveaway, member, reaction) => {
    log.info(`${member.user.tag} entered giveaway #${giveaway.messageID} (${reaction.emoji.name})`);

    if (!member.roles.cache.some(role => giveawayOnlyJoinableRoleIDs.includes(role.id))) {
        reaction.users.remove(member.user).catch(err => {
            log.error('Error removing reaction:', err);
            log.debug('Retrying in 5 seconds...');
            retryRemoveReaction(member, reaction);
        });

        member
            .send(`You must have specified role to participate in the giveaway: Read ${referenceMessageURL}`)
            .catch(err => {
                log.error('Error sending message:', err);
                log.debug('Retrying in 5 seconds...');
                retrySendMessage(member);
            });
    }
});

function retryRemoveReaction(member: GuildMember, reaction: MessageReaction): void {
    void promiseDelay(5 * 1000).then(() => {
        void reaction.users.remove(member.user).catch(err => {
            log.error('Error removing reaction:', err);
            log.debug('Retrying in 5 seconds...');
            retryRemoveReaction(member, reaction);
        });
    });
}

function retrySendMessage(member: GuildMember): void {
    void promiseDelay(5 * 1000).then(() => {
        void member
            .send(`You must have specified role to participate in the giveaway: Read ${referenceMessageURL}`)
            .catch(err => {
                log.error('Error sending message:', err);
                log.debug('Retrying in 5 seconds...');
                retrySendMessage(member);
            });
    });
}

function promiseDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

client.giveawaysManager.on('giveawayReactionRemoved', (giveaway, member, reaction) => {
    log.info(`${member.user.tag} unreact to giveaway #${giveaway.messageID} (${reaction.emoji.name})`);
});

client.giveawaysManager.on('giveawayEnded', (giveaway, winners) => {
    log.info(
        `Giveaway #${giveaway.messageID} ended! Winners: ${winners.map(member => member.user.username).join(', ')}`
    );
});

fs.readdir(path.resolve(__dirname, 'events'), (_err, files) => {
    files.forEach(file => {
        if (!file.endsWith('.js')) return;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
        const event = require(`./events/${file}`);

        const eventName = file.split('.')[0];
        log.info(`👌 Event loaded: ${eventName}`);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        client.on(eventName, event.bind(null, client));
        delete require.cache[require.resolve(`./events/${file}`)];
    });
});

client.commands = new Collection<string, any>();

fs.readdir(path.resolve(__dirname, 'commands'), (_err, files) => {
    files.forEach(file => {
        if (!file.endsWith('.js')) return;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
        const props = require(`./commands/${file}`);

        const commandName = file.split('.')[0];
        client.commands.set(commandName, props);

        log.info(`👌 Command loaded: ${commandName}`);
    });
});

import ON_DEATH from 'death';
import * as inspect from 'util';

ON_DEATH({ uncaughtException: true })((signalOrErr, origin) => {
    const crashed = signalOrErr !== 'SIGINT';

    if (crashed) {
        const botReady = typeof client.readyTimestamp === 'number';

        log.error(
            [
                'GiveawayBot' +
                    (!botReady
                        ? ' failed to start properly, this is most likely a temporary error. See the log:'
                        : ' crashed! Please create an issue with the following log:'),
                `package.version: ${process.env.BOT_VERSION || undefined}; node: ${process.version} ${
                    process.platform
                } ${process.arch}}`,
                'Stack trace:',
                inspect.inspect(origin)
            ].join('\r\n')
        );

        if (botReady) {
            log.error('Please inform IdiNium, Thanks.');
        }
    } else {
        log.warn('Received kill signal `' + (signalOrErr as string) + '`');
    }

    client.destroy();
    process.exit(1);
});

process.on('message', message => {
    if (message === 'shutdown') {
        log.warn('Process received shutdown message, stopping...');

        client.destroy();
        process.exit(1);
    } else {
        log.warn('Process received unknown message `' + (message as string) + '`');
    }
});

void client.login(process.env.BOT_TOKEN);

export interface ClientGiveaway extends Client {
    giveawaysManager: GiveawaysManager;
    commands: Collection<string, any>;
}
