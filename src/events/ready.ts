import log from '../lib/logger';
import { ClientGiveaway } from '../app';

module.exports = (client: ClientGiveaway) => {
    log.info(
        `Ready as ${client.user.tag} to serve in ${client.channels.cache.size} channels on ${client.guilds.cache.size} servers, for a total of ${client.users.cache.size} users.`
    );
};
