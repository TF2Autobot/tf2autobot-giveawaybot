import { ClientGiveaway } from '../app';
import { Message } from 'discord.js';
import log from '../lib/logger';

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
exports.run = async (client: ClientGiveaway, message: Message, args: string[]) => {
    if (
        !message.member.hasPermission('MANAGE_MESSAGES') &&
        !message.member.roles.cache.some(r => r.name === process.env.GIVEAWAY_MANAGER_NAME)
    ) {
        log.debug(`❌ ${message.author.toString()} don't have permission to reroll giveaways`);
        return message.channel.send('❌ You need to have the manage messages permissions to reroll giveaways.');
    }

    // If no message ID or giveaway name is specified
    if (!args[0]) {
        log.debug(`❌ ${message.author.toString()} did not specify a valid message ID`);
        return message.channel.send('❌ You have to specify a valid message ID!');
    }

    // try to find the giveaway with prize then with ID
    const giveaway =
        // Search with giveaway prize
        client.giveawaysManager.giveaways.find(g => g.prize === args.join(' ')) ||
        // Search with giveaway ID
        client.giveawaysManager.giveaways.find(g => g.messageID === args[0]);

    // If no giveaway was found
    if (!giveaway) {
        log.debug(`❌ ${message.author.toString()} - Unable to find a giveaway for ${args.join(' ')}`);
        return message.channel.send('❌ Unable to find a giveaway for `' + args.join(' ') + '`.');
    }

    // Reroll the giveaway
    client.giveawaysManager
        .reroll(giveaway.messageID)
        .then(() => {
            // Success message yayyyy
            log.debug(`✅ ${message.author.toString()} rerolled a giveaway #${giveaway.messageID}`);
            void message.channel.send('✅ Giveaway rerolled!');
        })
        .catch(err => {
            if ((err as string).startsWith(`Giveaway with message ID ${giveaway.messageID} is not ended.`)) {
                log.debug(
                    `❌ ${message.author.toString()} - Failed reroll attempt: #${giveaway.messageID} not ended yet`
                );
                void message.channel.send('❌ This giveaway is not ended!');
            } else {
                log.error(`❌ ${message.author.toString()} - An error occured on reroll`, err);
                void message.channel.send(`❌ An error occured: ${JSON.stringify(err)}`);
            }
        });
};
