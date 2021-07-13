import { ClientGiveaway } from '../app';
import { Message, TextChannel } from 'discord.js';
import { GiveawayStartOptions } from 'discord-giveaways';
import ms from 'ms';
import log from '../lib/logger';

const winMessage = process.env.GIVEAWAY_WIN_MESSAGE;
const giveawayBonusEntryRoleIDs = JSON.parse(process.env.GIVEAWAY_BONUS_ENTRY_ROLE_IDS) as string[];

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
exports.run = async (client: ClientGiveaway, message: Message, args: string[]) => {
    // Giveaway channel
    const giveawayChannel = client.channels.cache.get(process.env.GIVEAWAY_CHANNEL_ID) as TextChannel;
    // Giveaway duration
    const giveawayDuration = args[0];
    // If the duration isn't valid
    if (!giveawayDuration || isNaN(ms(giveawayDuration) as number)) {
        log.debug(`❌ ${message.author.toString()} did not specify a valid duration`);
        return message.channel.send('❌ You have to specify a valid duration!');
    }

    const inputDuration = ms(giveawayDuration);
    const minTime = ms(process.env.MINIMUM_TIME) || 15 * 60 * 1000;
    const maxTime = ms(process.env.MAXIMUM_TIME) || 23 * 60 * 60 * 1000;

    if (inputDuration < minTime || inputDuration > maxTime) {
        log.debug(`❌ ${message.author.toString()} did not specify a valid duration`);
        return message.channel.send(
            `❌ Duration must be at least ${ms(minTime, { long: true })} or up to ${ms(maxTime, { long: true })}!`
        );
    }

    // Number of winners
    const giveawayNumberWinners = args[1];
    // If the specified number of winners is not a number?!!
    if (isNaN(+giveawayNumberWinners) || parseInt(giveawayNumberWinners) <= 0) {
        log.debug(`❌ ${message.author.toString()} did not specify a valid number of winners`);
        return message.channel.send('❌ You have to specify a valid number of winners!');
    }

    if (parseInt(giveawayNumberWinners) > 10) {
        log.debug(`❌ ${message.author.toString()} specified number of winners of more than 10`);
        return message.channel.send('❌ The number of winners should not exceed 10!');
    }

    // Giveaway prize
    const giveawayPrize = args.slice(2).join(' ');
    // If no prize is specified
    if (!giveawayPrize) {
        log.debug(`❌ ${message.author.toString()} did not specify a valid prize`);
        return message.channel.send('❌ You have to specify a valid prize!');
    }

    if (giveawayPrize.length > 256) {
        log.debug(`❌ ${message.author.toString()} specify a prize with more than 256 characters`);
        return message.channel.send('❌ Prize(s) field should not exceed 256 characters!');
    }

    // Start the giveaway
    const giveawayOptions: GiveawayStartOptions = {
        // The giveaway duration
        time: inputDuration as number,
        // The giveaway prize
        prize: giveawayPrize,
        // The giveaway winner count
        winnerCount: parseInt(giveawayNumberWinners),
        // Who hosts this giveaway
        hostedBy: process.env.HOSTED_BY === 'true' ? message.author : null,
        // Messages.
        messages: {
            giveaway:
                (process.env.MENTION_ROLE ? `<@&${process.env.GIVEAWAY_ROLE_ID}>\n\n` : '') + '🎉🎉 **GIVEAWAY** 🎉🎉',
            giveawayEnded:
                (process.env.MENTION_ROLE ? `<@&${process.env.GIVEAWAY_ROLE_ID}>\nThanks for participating!\n\n` : '') +
                '🎉🎉 **GIVEAWAY ENDED** 🎉🎉',
            timeRemaining: 'Time remaining: **{duration}**!',
            inviteToParticipate: 'React with 🎉 to participate!',
            winMessage: winMessage ? winMessage : 'Congratulations, {winners}! You won **{prize}**!\n{messageURL}',
            embedFooter: 'Giveaways',
            noWinner: 'Giveaway cancelled, no valid participations.',
            hostedBy: 'Hosted by: {user}',
            winners: 'winner(s)',
            endedAt: 'Ended at',
            units: {
                seconds: 'seconds',
                minutes: 'minutes',
                hours: 'hours',
                days: 'days',
                pluralS: false // Not needed, because units end with a S so it will automatically removed if the unit value is lower than 2.. apparently the node extension likes it tho so idrc
            }
        }
    };

    if (giveawayBonusEntryRoleIDs.length > 0) {
        giveawayOptions.bonusEntries = [
            // Members with specified role(s) will get 2 bonus entries
            {
                bonus: member => (member.roles.cache.some(r => giveawayBonusEntryRoleIDs.includes(r.id)) ? 2 : null),
                cumulative: false
            }
        ];
    }

    void client.giveawaysManager.start(giveawayChannel, giveawayOptions);

    log.debug(`✅ ${message.author.toString()} started a giveaway in ${giveawayChannel.toString()}`);
    void message.channel.send(`Giveaway started in ${giveawayChannel.toString()}!`);
};
