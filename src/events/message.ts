import { ClientGiveaway } from '../app';
import { Message } from 'discord.js';

module.exports = (client: ClientGiveaway, message: Message) => {
    // I hate robots so much.
    if (message.author.bot) return;

    // Ignore messages not starting with the prefix.. I like the config file 'cuz it's so nice and neat...
    if (message.content.indexOf(process.env.PREFIX) !== 0) return;

    // standard argument/command name definition.
    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // grab the command
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cmd = client.commands.get(command);

    // This is just a normal message. I think there's a better way to do this, but idrc.
    if (!cmd) return;

    // Run the command
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    cmd.run(client, message, args);
};
